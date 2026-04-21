import { Router, Request, Response } from "express";
import { pool } from "../db/pool.js";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const totals = await pool.query(`
    SELECT 
      COUNT(*) as total_onboardings,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE status = 'review_needed') as review_needed,
      COUNT(*) FILTER (WHERE status = 'error') as errors,
      AVG(total_tokens) as avg_tokens,
      AVG(total_cost_usd) as avg_cost,
      AVG(confidence_score) FILTER (WHERE confidence_score IS NOT NULL) as avg_confidence,
      SUM(total_tokens) as sum_tokens,
      SUM(total_cost_usd) as sum_cost
    FROM onboardings
  `);

  const byState = await pool.query(`
    SELECT state, COUNT(*) as count, AVG(confidence_score) as avg_confidence
    FROM onboardings GROUP BY state ORDER BY count DESC
  `);

  const reviewPending = await pool.query(
    `SELECT COUNT(*) FROM review_queue WHERE reviewer_action IS NULL`
  );

  const row = totals.rows[0];
  res.json({
    totalOnboardings: parseInt(row.total_onboardings),
    completed: parseInt(row.completed),
    inProgress: parseInt(row.in_progress),
    reviewNeeded: parseInt(row.review_needed),
    errors: parseInt(row.errors),
    avgTokens: row.avg_tokens ? Math.round(parseFloat(row.avg_tokens)) : 0,
    avgCostUsd: row.avg_cost ? parseFloat(parseFloat(row.avg_cost).toFixed(4)) : 0,
    avgConfidence: row.avg_confidence ? parseFloat(parseFloat(row.avg_confidence).toFixed(3)) : 0,
    totalTokens: parseInt(row.sum_tokens) || 0,
    totalCostUsd: row.sum_cost ? parseFloat(parseFloat(row.sum_cost).toFixed(4)) : 0,
    reviewQueueSize: parseInt(reviewPending.rows[0].count),
    byState: byState.rows.map((r) => ({
      state: r.state,
      count: parseInt(r.count),
      avgConfidence: r.avg_confidence ? parseFloat(parseFloat(r.avg_confidence).toFixed(3)) : null,
    })),
  });
});

export default router;
