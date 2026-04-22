import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { validateEnv } from "./env.js";
import { logger } from "./logger.js";
import { authMiddleware } from "./middleware/auth.js";
import { pool } from "./db/pool.js";
import { migrate } from "./db/migrate.js";
import intakeRouter from "./routes/intake.js";
import statusRouter from "./routes/status.js";
import agentsRouter from "./routes/agents.js";
import reviewRouter from "./routes/review.js";
import metricsRouter from "./routes/metrics.js";
import artifactsRouter from "./routes/artifacts.js";

// Validate env on boot — fail fast
const env = validateEnv();

const app = express();
const PORT = parseInt(env.PORT);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(authMiddleware);

// Request logging
app.use((req, _res, next) => {
  if (req.path !== "/api/health") {
    logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  }
  next();
});

// Routes
app.use("/api/intake", intakeRouter);
app.use("/api/status", statusRouter);
app.use("/api/agents", agentsRouter);
app.use("/agents", agentsRouter);
app.use("/api/review", reviewRouter);
app.use("/api/metrics", metricsRouter);
app.use("/api/artifacts", artifactsRouter);

// Eval
app.post("/api/eval/run", async (_req, res) => {
  const { runEvalSet } = await import("./services/eval.js");
  res.json({ message: "Eval set started (~6 min for 10 providers).", startedAt: new Date().toISOString() });
  runEvalSet().then((results) => logger.info("Eval completed", results)).catch((err) => logger.error("Eval failed", { error: String(err) }));
});

app.get("/api/eval/golden-set", async (_req, res) => {
  const { GOLDEN_SET } = await import("./services/eval.js");
  res.json(GOLDEN_SET);
});

// Health check — verifies DB connectivity
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", service: "providerpilot-api", db: "connected", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "degraded", service: "providerpilot-api", db: "disconnected", timestamp: new Date().toISOString() });
  }
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await pool.end();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down");
  await pool.end();
  process.exit(0);
});

async function start() {
  await migrate();
  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`ProviderPilot API running`, { port: PORT });
  });
}

start().catch((err) => {
  logger.error("Failed to start", { error: String(err) });
  process.exit(1);
});
