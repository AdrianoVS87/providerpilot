import { pool } from "../db/pool.js";
import { agentThink } from "./minimax.js";
import { createIssue, updateIssue, addComment } from "./paperclip.js";
import { v4 as uuid } from "uuid";
import { EventEmitter } from "events";

// Agent IDs from Paperclip
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const agentIds = JSON.parse(readFileSync(join(__dirname, "../../agent-ids.json"), "utf-8"));

export const pipelineEvents = new EventEmitter();
pipelineEvents.setMaxListeners(100);

// Load knowledge base for a state
function loadKnowledgeBase(state: string): string {
  try {
    const kbPath = join(__dirname, `../../knowledge-bases/${state.toLowerCase()}/licensing.md`);
    const content = readFileSync(kbPath, "utf-8");
    return content.slice(0, 3000); // cap at 3000 chars to fit context
  } catch {
    return "No state-specific knowledge base available. Use general federal childcare licensing guidelines.";
  }
}

const VALID_STATES = ["CA", "TX", "FL", "NY", "MI", "NV", "IN", "OH", "GA", "IL"];

interface IntakeData {
  providerName: string;
  businessName?: string;
  state: string;
  address?: string;
  phone?: string;
  email?: string;
  facilityType?: string;
  ageGroups?: string[];
  maxCapacity?: number;
}

async function addStep(
  onboardingId: string,
  agentName: string,
  agentId: string | null,
  action: string,
  status: string,
  input?: unknown,
  output?: unknown,
  confidence?: number,
  tokens?: number,
  cost?: number
) {
  const stepId = uuid();
  await pool.query(
    `INSERT INTO onboarding_steps (id, onboarding_id, agent_name, agent_id, action, status, input, output, confidence, tokens_used, cost_usd, started_at, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), CASE WHEN $6 = 'completed' THEN NOW() ELSE NULL END)`,
    [stepId, onboardingId, agentName, agentId, action, status, JSON.stringify(input || {}), JSON.stringify(output || {}), confidence, tokens || 0, cost || 0]
  );
  pipelineEvents.emit("step", { onboardingId, stepId, agentName, action, status, confidence, tokens });
  return stepId;
}

async function updateStep(stepId: string, status: string, output?: unknown, confidence?: number, tokens?: number) {
  await pool.query(
    `UPDATE onboarding_steps SET status = $2, output = $3, confidence = $4, tokens_used = $5, completed_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE completed_at END WHERE id = $1`,
    [stepId, status, JSON.stringify(output || {}), confidence, tokens || 0]
  );
}

async function addToReviewQueue(onboardingId: string, stepId: string, agentName: string, reason: string, output: unknown) {
  await pool.query(
    `INSERT INTO review_queue (onboarding_id, step_id, agent_name, reason, original_output) VALUES ($1, $2, $3, $4, $5)`,
    [onboardingId, stepId, agentName, reason, JSON.stringify(output)]
  );
}

export async function runPipeline(data: IntakeData): Promise<string> {
  if (!VALID_STATES.includes(data.state)) {
    throw new Error(`Invalid state: ${data.state}. Must be one of: ${VALID_STATES.join(", ")}`);
  }

  // Create onboarding record
  const res = await pool.query(
    `INSERT INTO onboardings (provider_name, business_name, state, address, phone, email, facility_type, age_groups, max_capacity, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'in_progress') RETURNING id`,
    [data.providerName, data.businessName, data.state, data.address, data.phone, data.email, data.facilityType || "home-based", data.ageGroups || [], data.maxCapacity]
  );
  const onboardingId = res.rows[0].id;

  // Run pipeline async — don't block the response
  runPipelineSteps(onboardingId, data).catch((err) => {
    console.error(`[pipeline] Error for ${onboardingId}:`, err);
    pool.query(`UPDATE onboardings SET status = 'error', updated_at = NOW() WHERE id = $1`, [onboardingId]);
  });

  return onboardingId;
}

const COMPANY_ID = agentIds.companyId;
const PROJECT_ID = process.env.PAPERCLIP_PROJECT_ID || "";

async function createPaperclipTask(title: string, description: string, assigneeId: string, parentId?: string): Promise<string | null> {
  if (!PROJECT_ID) return null;
  try {
    const issue = await createIssue(COMPANY_ID, { title, description, projectId: PROJECT_ID, assigneeId, parentId, status: "backlog" });
    return issue.id;
  } catch (err) {
    console.warn("[paperclip] Failed to create issue:", err);
    return null;
  }
}

async function completePaperclipTask(issueId: string | null, agentId: string, summary: string) {
  if (!issueId) return;
  try {
    await updateIssue(COMPANY_ID, issueId, { status: "done" });
    await addComment(COMPANY_ID, issueId, summary, agentId);
  } catch (err) {
    console.warn("[paperclip] Failed to update issue:", err);
  }
}

async function runPipelineSteps(onboardingId: string, data: IntakeData) {
  const state = data.state;
  const stateDirectorId = (agentIds.stateDirectors as Record<string, string>)[state] || null;
  let totalTokens = 0;

  // Create parent task in Paperclip
  const parentTaskId = await createPaperclipTask(
    `Onboard ${data.providerName} — ${state}`,
    `Full onboarding pipeline for ${data.providerName} (${data.businessName || "N/A"}) in ${state}. Facility: ${data.facilityType}. Capacity: ${data.maxCapacity}.`,
    agentIds.executives.CEO
  );

  // Step 1: CEO intake
  const ceoStepId = await addStep(onboardingId, "CEO-Agent", agentIds.executives.CEO, "intake_received", "in_progress", data);
  const ceoResult = await agentThink(
    "CEO-Agent", "Chief Executive Officer",
    "You manage provider onboarding across 10 US states. Analyze this intake and determine the routing.",
    `New provider intake: ${data.providerName} in ${state}. Business: ${data.businessName || "N/A"}. Facility: ${data.facilityType}. Capacity: ${data.maxCapacity}. Determine routing and priority.`,
    200
  );
  totalTokens += ceoResult.tokens;
  await updateStep(ceoStepId, "completed", { decision: ceoResult.content, routedTo: `VP-Licensing → Director-${state}` }, undefined, ceoResult.tokens);
  await completePaperclipTask(parentTaskId, agentIds.executives.CEO, `Intake processed. Routed to VP-Licensing → Director-${state}.`);

  // Step 2: VP-Licensing routes
  const vplStepId = await addStep(onboardingId, "VP-Licensing", agentIds.vps["VP-Licensing"], "routing_to_state", "in_progress", { state });
  const vplResult = await agentThink(
    "VP-Licensing", "VP of Licensing",
    "You route provider intakes to the correct state director based on location and licensing requirements.",
    `Route provider ${data.providerName} to ${state} director. CEO assessment: ${ceoResult.content}`,
    150
  );
  totalTokens += vplResult.tokens;
  await updateStep(vplStepId, "completed", { routing: vplResult.content, directorAssigned: `Director-${state}` }, undefined, vplResult.tokens);

  // Step 3: State Director dispatches specialists
  const dirStepId = await addStep(onboardingId, `Director-${state}`, stateDirectorId, "dispatching_specialists", "in_progress", { state });
  const dirResult = await agentThink(
    `Director-${state}`, `State Director — ${state}`,
    `You manage childcare provider onboarding for ${state}. Dispatch specialists for document extraction, compliance checking, form filling, and coaching.`,
    `Dispatch specialists for ${data.providerName}. Provider details: ${JSON.stringify(data)}. Assign DocExtractor, ComplianceChecker, FormFiller, and CoachWriter.`,
    200
  );
  totalTokens += dirResult.tokens;
  await updateStep(dirStepId, "completed", { dispatch: dirResult.content }, undefined, dirResult.tokens);

  // Step 4: Specialists run in parallel — with state KB injected
  const focalStates = ["CA", "TX", "NY", "MI", "NV"];
  const stateKey = focalStates.includes(state) ? state : "TX";
  const stateKB = loadKnowledgeBase(state);

  // Create sub-tasks in Paperclip for each specialist
  const docTaskId = await createPaperclipTask(`DocExtractor — ${data.providerName}`, `Extract documents for ${state}`, (agentIds.specialists as Record<string, string>)[`DocExtractor-${stateKey}`] || agentIds.executives.CEO, parentTaskId || undefined);
  const compTaskId = await createPaperclipTask(`ComplianceCheck — ${data.providerName}`, `Check ${state} compliance`, (agentIds.specialists as Record<string, string>)[`ComplianceChecker-${stateKey}`] || agentIds.executives.CEO, parentTaskId || undefined);
  const formTaskId = await createPaperclipTask(`FormFiller — ${data.providerName}`, `Fill ${state} application`, (agentIds.specialists as Record<string, string>)[`FormFiller-${stateKey}`] || agentIds.executives.CEO, parentTaskId || undefined);
  const coachTaskId = await createPaperclipTask(`CoachWriter — ${data.providerName}`, `Write coaching email for ${state}`, (agentIds.specialists as Record<string, string>)[`CoachWriter-${stateKey}`] || agentIds.executives.CEO, parentTaskId || undefined);

  const specialistResults = await Promise.all([
    runSpecialist(onboardingId, `DocExtractor-${stateKey}`, "DocExtractor", "document extraction specialist",
      `Extract and validate required documents for ${data.providerName} in ${state}.\n\nSTATE LICENSING REQUIREMENTS:\n${stateKB}\n\nBased on the above regulations, list the specific documents this provider needs. Check ID validity, certifications, and inspection reports. Flag any missing documents.`,
      (agentIds.specialists as Record<string, string>)[`DocExtractor-${stateKey}`]),

    runSpecialist(onboardingId, `ComplianceChecker-${stateKey}`, "ComplianceChecker", "compliance analyst",
      `Check compliance for ${data.providerName} in ${state}. Facility type: ${data.facilityType}. Capacity: ${data.maxCapacity}.\n\nSTATE LICENSING REQUIREMENTS:\n${stateKB}\n\nCompare the provider's setup against the above state-specific regulations. List each requirement, whether it's met/unknown/missing, and any compliance gaps.`,
      (agentIds.specialists as Record<string, string>)[`ComplianceChecker-${stateKey}`]),

    runSpecialist(onboardingId, `FormFiller-${stateKey}`, "FormFiller", "form automation specialist",
      `Generate pre-filled licensing application for ${data.providerName} in ${state}.\n\nSTATE LICENSING REQUIREMENTS:\n${stateKB}\n\nProvider data: ${JSON.stringify(data)}\n\nUsing the state-specific application process above, generate the pre-filled form fields. Reference the actual form numbers and required fields from the regulations.`,
      (agentIds.specialists as Record<string, string>)[`FormFiller-${stateKey}`]),

    runSpecialist(onboardingId, `CoachWriter-${stateKey}`, "CoachWriter", "onboarding coach",
      `Write personalized next-step coaching email for ${data.providerName} in ${state}.\n\nSTATE LICENSING REQUIREMENTS:\n${stateKB}\n\nUsing the actual application process and costs from the above regulations, write a warm, specific coaching email with numbered next steps. Include real form numbers, training requirements, and estimated costs from the regulations.`,
      (agentIds.specialists as Record<string, string>)[`CoachWriter-${stateKey}`]),
  ]);

  // Complete Paperclip sub-tasks
  const paperclipTaskIds = [docTaskId, compTaskId, formTaskId, coachTaskId];
  for (let i = 0; i < specialistResults.length; i++) {
    totalTokens += specialistResults[i].tokens;
    await completePaperclipTask(paperclipTaskIds[i], (agentIds.specialists as Record<string, string>)[specialistResults[i].name] || "", specialistResults[i].content.slice(0, 500));
  }

  // Step 5: ConfidenceGate scores outputs — INDEPENDENT JUDGE
  // Uses different temperature (0.1 = more deterministic), different system prompt framing,
  // and explicitly adversarial scoring rubric to reduce correlated failures with specialists
  const gateStepId = await addStep(onboardingId, "ConfidenceGate", agentIds.validators.ConfidenceGate, "scoring_outputs", "in_progress");
  const gateResult = await agentThink(
    "ConfidenceGate", "Independent Quality Auditor",
    `You are a SEPARATE, ADVERSARIAL quality auditor. You did NOT produce the outputs below — another system did. Your job is to find flaws. Score STRICTLY on a 0.0-1.0 scale using this rubric:
- 0.95-1.0: Factually correct, cites specific regulations, actionable, complete
- 0.85-0.94: Mostly correct but missing specifics or has minor gaps
- 0.70-0.84: Significant gaps, vague, or partially incorrect
- Below 0.70: Incorrect, hallucinated, or unusable
Return ONLY a JSON object like: {"DocExtractor": 0.91, "ComplianceChecker": 0.85, "FormFiller": 0.93, "CoachWriter": 0.88}
Do NOT explain. JSON only.`,
    `Audit these specialist outputs for provider "${data.providerName}" in ${state}. The state knowledge base was provided to specialists. Score each:\n\n${specialistResults.map((r) => `### ${r.name}\n${r.content}`).join("\n\n")}`,
    300,
    { temperature: 0.1 }  // Low temperature = more deterministic, less correlated with specialists at 0.4
  );
  totalTokens += gateResult.tokens;

  // Parse confidence scores — strip <think> tags first, then extract JSON
  let scores: Record<string, number> = {};
  try {
    const cleaned = gateResult.content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Normalize: accept nested or flat structures
      for (const [key, val] of Object.entries(parsed)) {
        if (typeof val === "number") {
          scores[key] = val;
        } else if (typeof val === "object" && val !== null && "score" in val) {
          scores[key] = (val as { score: number }).score;
        }
      }
    }
    if (Object.keys(scores).length === 0) throw new Error("No scores parsed");
  } catch (parseErr) {
    // HONEST failure: don't fabricate scores — flag entire run for human review
    console.error(`[confidence-gate] Failed to parse scores for ${onboardingId}:`, parseErr, "Raw:", gateResult.content);
    // All specialists get 0.0 = guaranteed human review
    const names = ["DocExtractor", "ComplianceChecker", "FormFiller", "CoachWriter"];
    names.forEach((n) => { scores[n] = 0.0; });
  }

  const avgConfidence = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;
  await updateStep(gateStepId, "completed", { scores, avgConfidence, gateAnalysis: gateResult.content }, avgConfidence, gateResult.tokens);

  // Flag low-confidence items for human review
  for (const [name, score] of Object.entries(scores)) {
    if (score < 0.9) {
      const specialist = specialistResults.find((r) => r.name.startsWith(name));
      if (specialist) {
        await addToReviewQueue(onboardingId, specialist.stepId, name, `Confidence ${(score * 100).toFixed(1)}% below 90% threshold`, specialist.content);
        pipelineEvents.emit("step", {
          onboardingId,
          agentName: "ConfidenceGate",
          action: "flagged_for_review",
          status: "review_needed",
          confidence: score,
        });
      }
    }
  }

  // Step 6: CostMonitor check
  const costStepId = await addStep(onboardingId, "CostMonitor", agentIds.validators.CostMonitor, "budget_check", "in_progress");
  const estimatedCost = totalTokens * 0.000003; // rough estimate
  await updateStep(costStepId, "completed", {
    totalTokens,
    estimatedCostUsd: estimatedCost,
    budgetLimit: 2.0,
    withinBudget: estimatedCost < 2.0,
  }, undefined, 0);

  // Update onboarding record
  const finalStatus = avgConfidence >= 0.9 ? "completed" : "review_needed";
  await pool.query(
    `UPDATE onboardings SET status = $2, confidence_score = $3, total_tokens = $4, total_cost_usd = $5, updated_at = NOW() WHERE id = $1`,
    [onboardingId, finalStatus, avgConfidence, totalTokens, estimatedCost]
  );

  pipelineEvents.emit("complete", { onboardingId, status: finalStatus, confidence: avgConfidence, totalTokens, cost: estimatedCost });
}

async function runSpecialist(
  onboardingId: string,
  agentName: string,
  role: string,
  title: string,
  prompt: string,
  agentId?: string
): Promise<{ name: string; content: string; tokens: number; stepId: string }> {
  const stepId = await addStep(onboardingId, agentName, agentId || null, `${role.toLowerCase()}_analysis`, "in_progress");

  // Retry with exponential backoff (max 2 attempts)
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await agentThink(agentName, title, `You are a specialist ${role} in the ProviderPilot system.`, prompt, 400);
      await updateStep(stepId, "completed", { analysis: result.content, model: result.model, attempt }, undefined, result.tokens);
      return { name: agentName, content: result.content, tokens: result.tokens, stepId };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[pipeline] ${agentName} attempt ${attempt + 1} failed:`, lastError.message);
      if (attempt < 1) await new Promise((r) => setTimeout(r, 2000 * (attempt + 1))); // backoff
    }
  }

  // Failed after retries — mark step as error, return degraded result
  const fallbackContent = `[DEGRADED] ${agentName} failed after 2 attempts: ${lastError?.message}. Manual review required.`;
  await updateStep(stepId, "completed", { analysis: fallbackContent, error: true, attempts: 2 }, 0.0, 0);
  return { name: agentName, content: fallbackContent, tokens: 0, stepId };
}
