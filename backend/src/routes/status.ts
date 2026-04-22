import { Router, Request, Response } from "express";
import { pool } from "../db/pool.js";
import { pipelineEvents } from "../services/pipeline.js";
import { getLatestArtifactsForOnboarding } from "./artifacts.js";

const router = Router();

// GET /api/status/:id
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const ob = await pool.query("SELECT * FROM onboardings WHERE id = $1", [id]);
  if (ob.rows.length === 0) {
    res.status(404).json({ error: "Onboarding not found" });
    return;
  }

  const steps = await pool.query(
    "SELECT * FROM onboarding_steps WHERE onboarding_id = $1 ORDER BY created_at ASC",
    [id]
  );

  const onboarding = ob.rows[0];
  const artifacts = await getLatestArtifactsForOnboarding(id);
  const artifactByStep = new Map<string, any[]>();
  for (const a of artifacts) {
    const arr = artifactByStep.get(a.step_id) || [];
    arr.push(a);
    artifactByStep.set(a.step_id, arr);
  }

  res.json({
    onboardingId: onboarding.id,
    status: onboarding.status,
    providerName: onboarding.provider_name,
    state: onboarding.state,
    confidence: onboarding.confidence_score ? parseFloat(onboarding.confidence_score) : null,
    cost: {
      totalTokens: onboarding.total_tokens,
      totalUsd: onboarding.total_cost_usd ? parseFloat(onboarding.total_cost_usd) : 0,
    },
    steps: steps.rows.map((s) => ({
      id: s.id,
      agent: s.agent_name,
      action: s.action,
      status: s.status,
      confidence: s.confidence ? parseFloat(s.confidence) : null,
      tokens: s.tokens_used,
      output: s.output,
      artifacts: artifactByStep.get(s.id) || [],
      startedAt: s.started_at,
      completedAt: s.completed_at,
    })),
    createdAt: onboarding.created_at,
    updatedAt: onboarding.updated_at,
  });
});

// GET /api/status/:id/stream (SSE)
router.get("/:id/stream", (req: Request, res: Response) => {
  const { id } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const onStep = (data: { onboardingId: string }) => {
    if (data.onboardingId === id) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  const onComplete = (data: { onboardingId: string }) => {
    if (data.onboardingId === id) {
      res.write(`data: ${JSON.stringify({ ...data, type: "complete" })}\n\n`);
      cleanup();
    }
  };

  const cleanup = () => {
    pipelineEvents.off("step", onStep);
    pipelineEvents.off("complete", onComplete);
    res.end();
  };

  pipelineEvents.on("step", onStep);
  pipelineEvents.on("complete", onComplete);

  req.on("close", cleanup);
});

export default router;
