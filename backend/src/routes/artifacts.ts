import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { pool } from "../db/pool.js";

const router = Router();

function sameOriginBasicCheck(req: Request): boolean {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) return true; // non-browser or same-origin fetches
  try {
    const o = new URL(origin);
    return o.host === host;
  } catch {
    return false;
  }
}

// GET /api/artifacts/:id/download
router.get("/:id/download", async (req: Request, res: Response) => {
  if (!sameOriginBasicCheck(req)) {
    res.status(403).json({ error: "Forbidden (same-origin check failed)" });
    return;
  }

  const { id } = req.params;
  const row = await pool.query("SELECT * FROM artifacts WHERE id=$1", [id]);
  if (row.rows.length === 0) {
    res.status(404).json({ error: "Artifact not found" });
    return;
  }

  const artifact = row.rows[0];
  if (!fs.existsSync(artifact.file_path)) {
    res.status(404).json({ error: "Artifact file missing" });
    return;
  }

  const state = artifact.metadata?.state || "state";
  const shortId = String(id).slice(0, 8);
  const filename = `application-${state}-${shortId}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);

  const stream = fs.createReadStream(artifact.file_path);
  stream.on("error", () => res.status(500).end());
  stream.pipe(res);
});

// GET /api/artifacts/by-step/:stepId
router.get("/by-step/:stepId", async (req: Request, res: Response) => {
  const { stepId } = req.params;
  const result = await pool.query(
    `SELECT id, step_id, onboarding_id, artifact_type, artifact_url, sha256, bytes, created_at, metadata
     FROM artifacts WHERE step_id=$1 ORDER BY created_at DESC`,
    [stepId]
  );
  res.json(result.rows);
});

// Helper export for other routes
export async function getLatestArtifactsForOnboarding(onboardingId: string) {
  const result = await pool.query(
    `SELECT DISTINCT ON (step_id)
      id, step_id, onboarding_id, artifact_type, artifact_url, sha256, bytes, created_at, metadata
     FROM artifacts
     WHERE onboarding_id = $1
     ORDER BY step_id, created_at DESC`,
    [onboardingId]
  );
  return result.rows;
}

export async function getLatestArtifactsForSteps(stepIds: string[]) {
  if (stepIds.length === 0) return [];
  const result = await pool.query(
    `SELECT DISTINCT ON (step_id)
      id, step_id, onboarding_id, artifact_type, artifact_url, sha256, bytes, created_at, metadata
     FROM artifacts
     WHERE step_id = ANY($1::uuid[])
     ORDER BY step_id, created_at DESC`,
    [stepIds]
  );
  return result.rows;
}

export default router;
