import fs from "fs";
import path from "path";
import crypto from "crypto";
import PDFDocument from "pdfkit";
import { pool } from "../db/pool.js";
import { logger } from "../logger.js";

const STORAGE_ROOT = "/opt/providerpilot/storage/pdfs";

export interface FormFillerOutput {
  analysis?: string;
  model?: string;
  attempt?: number;
  [k: string]: unknown;
}

export interface ArtifactRecord {
  id: string;
  step_id: string;
  onboarding_id: string;
  artifact_type: string;
  artifact_url: string;
  file_path: string;
  sha256: string;
  bytes: number;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function hashJson(data: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash("sha256");
    const s = fs.createReadStream(filePath);
    s.on("data", (d) => h.update(d));
    s.on("end", () => resolve(h.digest("hex")));
    s.on("error", reject);
  });
}

function drawTopBanner(doc: PDFKit.PDFDocument, title: string, subtitle: string) {
  const x = doc.page.margins.left;
  const y = doc.y;
  const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.save();
  doc.roundedRect(x, y, w, 72, 8).fill("#0f172a");
  doc.fillColor("#dbeafe").fontSize(10).text("ProviderPilot • Filled Licensing Application", x + 14, y + 12);
  doc.fillColor("#ffffff").fontSize(18).text(title, x + 14, y + 28);
  doc.fillColor("#94a3b8").fontSize(10).text(subtitle, x + 14, y + 52);
  doc.restore();
  doc.y = y + 86;
}

function drawSectionHeader(doc: PDFKit.PDFDocument, label: string) {
  const x = doc.page.margins.left;
  const y = doc.y;
  const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.save();
  doc.roundedRect(x, y, w, 24, 5).fill("#e2e8f0");
  doc.fillColor("#0f172a").fontSize(11).text(label, x + 10, y + 7);
  doc.restore();
  doc.y = y + 30;
}

function drawKeyValues(doc: PDFKit.PDFDocument, rows: Array<[string, string]>) {
  const x = doc.page.margins.left;
  let y = doc.y;
  const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const rowH = 20;
  for (const [k, v] of rows) {
    doc.save();
    doc.rect(x, y, w, rowH).strokeColor("#e5e7eb").lineWidth(1).stroke();
    doc.fillColor("#334155").fontSize(10).text(k, x + 8, y + 6, { width: 180 });
    doc.fillColor("#111827").fontSize(10).text(v || "N/A", x + 190, y + 6, { width: w - 198 });
    doc.restore();
    y += rowH;
  }
  doc.y = y + 8;
}

function writeFooter(doc: PDFKit.PDFDocument, onboardingId: string) {
  const y = doc.page.height - 46;
  doc.save();
  doc.moveTo(doc.page.margins.left, y - 6)
    .lineTo(doc.page.width - doc.page.margins.right, y - 6)
    .strokeColor("#e5e7eb").lineWidth(1).stroke();
  doc.fillColor("#64748b").fontSize(9).text(`ProviderPilot • Demo Artifact • Onboarding ${onboardingId}`, doc.page.margins.left, y);
  doc.text(`Generated at ${new Date().toISOString()}`, doc.page.margins.left, y + 12);
  doc.restore();
}

function renderGenericStateApplication(doc: PDFKit.PDFDocument, state: string, onboarding: any, output: FormFillerOutput) {
  drawTopBanner(doc, `Generic State Application (${state})`, "Demo placeholder template for non-priority states");
  drawSectionHeader(doc, "Provider Information");
  drawKeyValues(doc, [
    ["Provider Name", onboarding.provider_name || "N/A"],
    ["Business Name", onboarding.business_name || "N/A"],
    ["Address", onboarding.address || "N/A"],
    ["License Type", onboarding.facility_type || "home-based"],
    ["Application Date", new Date().toISOString().slice(0, 10)],
    ["State", state],
  ]);
  drawSectionHeader(doc, "FormFiller Summary");
  doc.fillColor("#1f2937").fontSize(10).text(output.analysis || "No analysis text available.", { width: 500, lineGap: 2 });
}

function renderTexasLicense(doc: PDFKit.PDFDocument, onboarding: any, output: FormFillerOutput) {
  drawTopBanner(doc, "Texas Child-Care Licensing Application", "Regulator: Texas HHSC • Form 2911 (demo fidelity)");
  drawSectionHeader(doc, "Application Header");
  drawKeyValues(doc, [
    ["State", "TX"],
    ["Program", "Registered Child-Care Home"],
    ["Regulatory Chapter", "26 TAC Chapter 747"],
    ["Application Date", new Date().toISOString().slice(0, 10)],
  ]);
  drawSectionHeader(doc, "Applicant Details");
  drawKeyValues(doc, [
    ["Provider Name", onboarding.provider_name || "N/A"],
    ["Business Name", onboarding.business_name || "N/A"],
    ["Address", onboarding.address || "N/A"],
    ["Facility Type", onboarding.facility_type || "home-based"],
  ]);
  drawSectionHeader(doc, "Extracted Compliance Notes");
  doc.fillColor("#1f2937").fontSize(10).text(output.analysis || "N/A", { width: 500, lineGap: 2 });
}

function renderCaliforniaLicense(doc: PDFKit.PDFDocument, onboarding: any, output: FormFillerOutput) {
  drawTopBanner(doc, "California Family Child Care Application", "Regulator: CDSS CCLD • Title 22 • LIC 200 series");
  drawSectionHeader(doc, "Application Header");
  drawKeyValues(doc, [
    ["State", "CA"],
    ["Program", "Family Child Care Home"],
    ["Regulatory Reference", "Title 22, Division 12"],
    ["Application Date", new Date().toISOString().slice(0, 10)],
  ]);
  drawSectionHeader(doc, "Applicant Details");
  drawKeyValues(doc, [
    ["Provider Name", onboarding.provider_name || "N/A"],
    ["Business Name", onboarding.business_name || "N/A"],
    ["Address", onboarding.address || "N/A"],
    ["Facility Type", onboarding.facility_type || "home-based"],
  ]);
  drawSectionHeader(doc, "FormFiller Summary");
  doc.fillColor("#1f2937").fontSize(10).text(output.analysis || "N/A", { width: 500, lineGap: 2 });
}

function renderNewYorkLicense(doc: PDFKit.PDFDocument, onboarding: any, output: FormFillerOutput) {
  drawTopBanner(doc, "New York Child Care Application", "Regulator: NY OCFS • Title 18 NYCRR");
  drawSectionHeader(doc, "Application Header");
  drawKeyValues(doc, [
    ["State", "NY"],
    ["Program", "Family/Group Family Day Care"],
    ["Regulatory Reference", "Title 18 NYCRR"],
    ["Application Date", new Date().toISOString().slice(0, 10)],
  ]);
  drawSectionHeader(doc, "Applicant Details");
  drawKeyValues(doc, [
    ["Provider Name", onboarding.provider_name || "N/A"],
    ["Business Name", onboarding.business_name || "N/A"],
    ["Address", onboarding.address || "N/A"],
    ["Facility Type", onboarding.facility_type || "home-based"],
  ]);
  drawSectionHeader(doc, "FormFiller Summary");
  doc.fillColor("#1f2937").fontSize(10).text(output.analysis || "N/A", { width: 500, lineGap: 2 });
}

function renderByState(doc: PDFKit.PDFDocument, state: string, onboarding: any, output: FormFillerOutput) {
  if (state === "TX") return renderTexasLicense(doc, onboarding, output);
  if (state === "CA") return renderCaliforniaLicense(doc, onboarding, output);
  if (state === "NY") return renderNewYorkLicense(doc, onboarding, output);
  return renderGenericStateApplication(doc, state, onboarding, output);
}

async function generatePdfFile(filePath: string, state: string, onboarding: any, output: FormFillerOutput): Promise<number> {
  ensureDir(path.dirname(filePath));
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const ws = fs.createWriteStream(filePath);
    doc.pipe(ws);

    renderByState(doc, state, onboarding, output);
    writeFooter(doc, onboarding.id);

    doc.end();
    ws.on("finish", () => {
      const st = fs.statSync(filePath);
      resolve(st.size);
    });
    ws.on("error", reject);
  });
}

export async function generateFilledApplicationArtifact(params: {
  stepId: string;
  onboardingId: string;
  state: string;
  formFillerOutput: FormFillerOutput;
}): Promise<ArtifactRecord | null> {
  const start = Date.now();
  const { stepId, onboardingId, state, formFillerOutput } = params;

  const onboardingRes = await pool.query("SELECT * FROM onboardings WHERE id=$1", [onboardingId]);
  if (onboardingRes.rows.length === 0) return null;
  const onboarding = onboardingRes.rows[0];

  const outputSha = hashJson(formFillerOutput);

  // idempotency by (step_id, sha256)
  const existing = await pool.query(
    `SELECT * FROM artifacts WHERE step_id=$1 AND sha256=$2 ORDER BY created_at DESC LIMIT 1`,
    [stepId, outputSha]
  );
  if (existing.rows.length > 0) {
    logger.info("pdf.generate skipped_idempotent", {
      provider_id: onboardingId,
      step_id: stepId,
      onboarding_id: onboardingId,
      state,
      template_version: `v1-${state}`,
      duration_ms: Date.now() - start,
      outcome: "skipped_idempotent",
    });
    return existing.rows[0] as ArtifactRecord;
  }

  const artifactIdRes = await pool.query("SELECT gen_random_uuid() AS id");
  const artifactId: string = artifactIdRes.rows[0].id;

  const filePath = path.join(STORAGE_ROOT, onboardingId, stepId, `${outputSha}.pdf`);
  let bytes = 0;
  let fileSha = "";

  try {
    bytes = await generatePdfFile(filePath, state, onboarding, formFillerOutput);
    fileSha = await hashFile(filePath);

    const artifactUrl = `/api/artifacts/${artifactId}/download`;
    const metadata = {
      state,
      template_version: `v1-${["CA", "TX", "NY"].includes(state) ? state : "GENERIC"}`,
      model: formFillerOutput.model || "unknown",
      step_output_sha256: outputSha,
      generated_at: new Date().toISOString(),
    };

    const insert = await pool.query(
      `INSERT INTO artifacts (id, step_id, onboarding_id, artifact_type, artifact_url, file_path, sha256, bytes, metadata)
       VALUES ($1,$2,$3,'filled_application_pdf',$4,$5,$6,$7,$8)
       RETURNING *`,
      [artifactId, stepId, onboardingId, artifactUrl, filePath, fileSha, bytes, JSON.stringify(metadata)]
    );

    logger.info("pdf.generate success", {
      provider_id: onboardingId,
      step_id: stepId,
      onboarding_id: onboardingId,
      state,
      template_version: metadata.template_version,
      pdf_bytes: bytes,
      sha256: fileSha,
      duration_ms: Date.now() - start,
      outcome: "success",
    });

    return insert.rows[0] as ArtifactRecord;
  } catch (error) {
    logger.error("pdf.generate failure", {
      provider_id: onboardingId,
      step_id: stepId,
      onboarding_id: onboardingId,
      state,
      template_version: `v1-${state}`,
      duration_ms: Date.now() - start,
      outcome: "failure",
      error: String(error),
    });
    return null;
  }
}

export async function getLatestArtifactByStep(stepId: string): Promise<ArtifactRecord | null> {
  const res = await pool.query(
    `SELECT * FROM artifacts WHERE step_id=$1 ORDER BY created_at DESC LIMIT 1`,
    [stepId]
  );
  return res.rows[0] || null;
}
