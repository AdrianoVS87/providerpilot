import { Router, Request, Response } from "express";
import { pool } from "../db/pool.js";
import { reviewSchema } from "../schemas.js";
import { getLatestArtifactsForSteps } from "./artifacts.js";

const router = Router();

// GET /api/review/queue
router.get("/queue", async (_req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT rq.*, o.provider_name, o.state, o.status as onboarding_status
     FROM review_queue rq
     JOIN onboardings o ON rq.onboarding_id = o.id
     WHERE rq.reviewer_action IS NULL
     ORDER BY rq.created_at DESC
     LIMIT 100`
  );

  const stepIds = result.rows.map((r) => r.step_id).filter(Boolean);
  const artifacts = await getLatestArtifactsForSteps(stepIds);
  const artifactsByStep = new Map<string, any[]>();
  for (const a of artifacts) {
    const arr = artifactsByStep.get(a.step_id) || [];
    arr.push(a);
    artifactsByStep.set(a.step_id, arr);
  }

  res.json(result.rows.map((r) => ({
    ...r,
    artifacts: artifactsByStep.get(r.step_id) || [],
  })));
});

// GET /api/review/history
router.get("/history", async (_req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT rq.*, o.provider_name, o.state, o.status as onboarding_status
     FROM review_queue rq
     JOIN onboardings o ON rq.onboarding_id = o.id
     WHERE rq.reviewer_action IS NOT NULL
     ORDER BY rq.reviewed_at DESC NULLS LAST, rq.created_at DESC
     LIMIT 300`
  );

  const stepIds = result.rows.map((r) => r.step_id).filter(Boolean);
  const artifacts = await getLatestArtifactsForSteps(stepIds);
  const artifactsByStep = new Map<string, any[]>();
  for (const a of artifacts) {
    const arr = artifactsByStep.get(a.step_id) || [];
    arr.push(a);
    artifactsByStep.set(a.step_id, arr);
  }

  res.json(result.rows.map((r) => ({
    ...r,
    artifacts: artifactsByStep.get(r.step_id) || [],
  })));
});

// POST /api/review/reopen/:reviewId — move processed item back to pending
router.post("/reopen/:reviewId", async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const row = await client.query(`SELECT * FROM review_queue WHERE id = $1 FOR UPDATE`, [reviewId]);
    if (row.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Review item not found" });
      return;
    }

    await client.query(
      `UPDATE review_queue
       SET reviewer_action = NULL, reviewed_at = NULL,
           reviewer_notes = COALESCE(reviewer_notes, '') || CASE WHEN COALESCE(reviewer_notes,'') = '' THEN '' ELSE ' | ' END || 'reopened:' || NOW()::text
       WHERE id = $1`,
      [reviewId]
    );

    await client.query("COMMIT");
    res.json({ success: true, reviewId, state: "pending" });
  } catch (err) {
    await client.query("ROLLBACK");
    const message = err instanceof Error ? err.message : "Reopen failed";
    res.status(500).json({ error: message });
  } finally {
    client.release();
  }
});

// DELETE /api/review/history/:reviewId — permanent removal from history
router.delete("/history/:reviewId", async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const row = await client.query(`SELECT * FROM review_queue WHERE id = $1 FOR UPDATE`, [reviewId]);
    if (row.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Review item not found" });
      return;
    }

    // Only allow deletion of processed items (history)
    if (!row.rows[0].reviewer_action) {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "Only history items can be permanently removed" });
      return;
    }

    await client.query(`DELETE FROM review_queue WHERE id = $1`, [reviewId]);
    await client.query("COMMIT");
    res.json({ success: true, reviewId, deleted: true });
  } catch (err) {
    await client.query("ROLLBACK");
    const message = err instanceof Error ? err.message : "Delete failed";
    res.status(500).json({ error: message });
  } finally {
    client.release();
  }
});

// POST /api/review/:onboardingId — transactional review with row locking
router.post("/:onboardingId", async (req: Request, res: Response) => {
  const { onboardingId } = req.params;
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { action, notes, stepId } = parsed.data;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock the specific review item to prevent race conditions
    if (!stepId) {
      res.status(400).json({ error: "stepId is required to prevent accidental mass-approval" });
      await client.query("ROLLBACK");
      client.release();
      return;
    }

    await client.query(
      `SELECT id FROM review_queue WHERE onboarding_id = $1 AND step_id = $2 AND reviewer_action IS NULL FOR UPDATE`,
      [onboardingId, stepId]
    );

    if (action === "edit") {
      // Edit Draft: keep item pending (do NOT set reviewer_action)
      await client.query(
        `UPDATE review_queue
         SET reviewer_notes = COALESCE($3, reviewer_notes)
         WHERE onboarding_id = $1 AND step_id = $2 AND reviewer_action IS NULL`,
        [onboardingId, stepId, notes || "Edited in dashboard"]
      );
    } else {
      // Approve/Reject: finalize review action and move to history
      await client.query(
        `UPDATE review_queue SET reviewer_action = $2, reviewer_notes = $3, reviewed_at = NOW()
         WHERE onboarding_id = $1 AND step_id = $4 AND reviewer_action IS NULL`,
        [onboardingId, action, notes || null, stepId]
      );
    }

    if (action === "approve") {
      const pending = await client.query(
        `SELECT COUNT(*) FROM review_queue WHERE onboarding_id = $1 AND reviewer_action IS NULL`,
        [onboardingId]
      );
      if (parseInt(pending.rows[0].count) === 0) {
        await client.query(
          `UPDATE onboardings SET status = 'completed', updated_at = NOW() WHERE id = $1`,
          [onboardingId]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ success: true, action, pending: action === "edit" });
  } catch (err) {
    await client.query("ROLLBACK");
    const message = err instanceof Error ? err.message : "Review failed";
    res.status(500).json({ error: message });
  } finally {
    client.release();
  }
});

export default router;
