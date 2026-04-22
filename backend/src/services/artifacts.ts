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

function writeFooter(doc: PDFKit.PDFDocument, onboardingId: string) {
  doc.moveDown(2);
  doc.fontSize(9).fillColor("#666").text(`ProviderPilot • Demo Artifact • Onboarding ${onboardingId}`);
  doc.text(`Generated at ${new Date().toISOString()}`);
}

function renderGenericStateApplication(doc: PDFKit.PDFDocument, state: string, onboarding: any, output: FormFillerOutput) {
  doc.fontSize(18).fillColor("#111").text(`Generic State Application — Demo Placeholder (${state})`);
  doc.moveDown();
  doc.fontSize(12).text(`Provider Name: ${onboarding.provider_name}`);
  doc.text(`Business Name: ${onboarding.business_name || "N/A"}`);
  doc.text(`Address: ${onboarding.address || "N/A"}`);
  doc.text(`License Type: ${onboarding.facility_type || "home-based"}`);
  doc.text(`Application Date: ${new Date().toISOString().slice(0, 10)}`);
  doc.moveDown();
  doc.fontSize(11).text("FormFiller Output Summary:");
  doc.fontSize(10).fillColor("#333").text(output.analysis || "No analysis text available.", { width: 500 });
}

function renderTexasLicense(doc: PDFKit.PDFDocument, onboarding: any, output: FormFillerOutput) {
  doc.fontSize(18).fillColor("#111").text("Texas Child-Care Licensing Application (Demo)");
  doc.moveDown();
  doc.fontSize(12).text("Regulator: Texas HHSC Child Care Regulation");
  doc.text("Reference Form: 2911 (demo fidelity)");
  doc.moveDown();
  doc.text(`Provider Name: ${onboarding.provider_name}`);
  doc.text(`Address: ${onboarding.address || "N/A"}`);
  doc.text(`Facility Type: ${onboarding.facility_type || "home-based"}`);
  doc.text(`State: TX`);
  doc.text(`Submitted Date: ${new Date().toISOString().slice(0, 10)}`);
  doc.moveDown();
  doc.fontSize(11).text("Extracted Compliance Notes:");
  doc.fontSize(10).fillColor("#333").text(output.analysis || "N/A", { width: 500 });
}

function renderCaliforniaLicense(doc: PDFKit.PDFDocument, onboarding: any, output: FormFillerOutput) {
  doc.fontSize(18).fillColor("#111").text("California Family Child Care Application (Demo)");
  doc.moveDown();
  doc.fontSize(12).text("Regulator: CDSS CCLD (Title 22)");
  doc.text("Application Type: Family Child Care Home");
  doc.moveDown();
  doc.text(`Provider Name: ${onboarding.provider_name}`);
  doc.text(`Address: ${onboarding.address || "N/A"}`);
  doc.text(`Facility Type: ${onboarding.facility_type || "home-based"}`);
  doc.text(`State: CA`);
  doc.text(`Application Date: ${new Date().toISOString().slice(0, 10)}`);
  doc.moveDown();
  doc.fontSize(11).text("FormFiller Summary:");
  doc.fontSize(10).fillColor("#333").text(output.analysis || "N/A", { width: 500 });
}

function renderNewYorkLicense(doc: PDFKit.PDFDocument, onboarding: any, output: FormFillerOutput) {
  doc.fontSize(18).fillColor("#111").text("New York Child Care Application (Demo)");
  doc.moveDown();
  doc.fontSize(12).text("Regulator: NY OCFS (Title 18 NYCRR)");
  doc.text("Program Type: Family/Group Family Day Care");
  doc.moveDown();
  doc.text(`Provider Name: ${onboarding.provider_name}`);
  doc.text(`Address: ${onboarding.address || "N/A"}`);
  doc.text(`Facility Type: ${onboarding.facility_type || "home-based"}`);
  doc.text(`State: NY`);
  doc.text(`Application Date: ${new Date().toISOString().slice(0, 10)}`);
  doc.moveDown();
  doc.fontSize(11).text("FormFiller Summary:");
  doc.fontSize(10).fillColor("#333").text(output.analysis || "N/A", { width: 500 });
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
