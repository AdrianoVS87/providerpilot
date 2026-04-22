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
  const estimatedTotal = row.sum_cost ? parseFloat(parseFloat(row.sum_cost).toFixed(4)) : 0;
  const estimatedAvg = row.avg_cost ? parseFloat(parseFloat(row.avg_cost).toFixed(4)) : 0;

  // Billing reconciliation placeholder until provider usage APIs are integrated
  const billedTotal: number | null = null;
  const billedAvg: number | null = null;
  const billedCoveragePct = 0;
  const deltaPct: number | null = null;

  res.json({
    costMode: "estimated",
    costAccuracy: "relative",
    costNote: "Estimated costs are token-based calculations. Billed costs require provider usage API reconciliation.",
    costViews: {
      estimated: {
        totalUsd: estimatedTotal,
        avgUsd: estimatedAvg,
        source: "token-pricing-table",
      },
      billed: {
        totalUsd: billedTotal,
        avgUsd: billedAvg,
        source: "provider-usage-api",
        coveragePct: billedCoveragePct,
      },
      deltaPct,
    },
    totalOnboardings: parseInt(row.total_onboardings),
    completed: parseInt(row.completed),
    inProgress: parseInt(row.in_progress),
    reviewNeeded: parseInt(row.review_needed),
    errors: parseInt(row.errors),
    avgTokens: row.avg_tokens ? Math.round(parseFloat(row.avg_tokens)) : 0,
    avgCostUsd: estimatedAvg,
    avgConfidence: row.avg_confidence ? parseFloat(parseFloat(row.avg_confidence).toFixed(3)) : 0,
    totalTokens: parseInt(row.sum_tokens) || 0,
    totalCostUsd: estimatedTotal,
    reviewQueueSize: parseInt(reviewPending.rows[0].count),
    byState: byState.rows.map((r) => ({
      state: r.state,
      count: parseInt(r.count),
      avgConfidence: r.avg_confidence ? parseFloat(parseFloat(r.avg_confidence).toFixed(3)) : null,
    })),
  });
});

export default router;
