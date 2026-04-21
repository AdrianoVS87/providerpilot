import { Router, Request, Response } from "express";
import { pool } from "../db/pool.js";

const router = Router();

// GET /api/review/queue
router.get("/queue", async (_req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT rq.*, o.provider_name, o.state, o.status as onboarding_status
     FROM review_queue rq
     JOIN onboardings o ON rq.onboarding_id = o.id
     WHERE rq.reviewer_action IS NULL
     ORDER BY rq.created_at DESC`
  );
  res.json(result.rows);
});

// POST /api/review/:onboardingId
router.post("/:onboardingId", async (req: Request, res: Response) => {
  const { onboardingId } = req.params;
  const { action, notes, stepId } = req.body;

  if (!["approve", "reject", "edit"].includes(action)) {
    res.status(400).json({ error: "action must be approve, reject, or edit" });
    return;
  }

  await pool.query(
    `UPDATE review_queue SET reviewer_action = $2, reviewer_notes = $3, reviewed_at = NOW()
     WHERE onboarding_id = $1 AND ($4::uuid IS NULL OR step_id = $4)`,
    [onboardingId, action, notes, stepId || null]
  );

  if (action === "approve") {
    // Check if all review items for this onboarding are resolved
    const pending = await pool.query(
      `SELECT COUNT(*) FROM review_queue WHERE onboarding_id = $1 AND reviewer_action IS NULL`,
      [onboardingId]
    );
    if (parseInt(pending.rows[0].count) === 0) {
      await pool.query(
        `UPDATE onboardings SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [onboardingId]
      );
    }
  }

  res.json({ success: true, action });
});

export default router;
