import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { migrate } from "./db/migrate.js";
import intakeRouter from "./routes/intake.js";
import statusRouter from "./routes/status.js";
import agentsRouter from "./routes/agents.js";
import reviewRouter from "./routes/review.js";
import metricsRouter from "./routes/metrics.js";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "4000");

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/intake", intakeRouter);
app.use("/api/status", statusRouter);
app.use("/api/agents", agentsRouter);
app.use("/agents", agentsRouter); // Paperclip heartbeat endpoints
app.use("/api/review", reviewRouter);
app.use("/api/metrics", metricsRouter);

// Eval endpoint
app.post("/api/eval/run", async (_req, res) => {
  const { runEvalSet } = await import("./services/eval.js");
  res.json({ message: "Eval set started. This will take ~6 minutes for 10 providers.", startedAt: new Date().toISOString() });
  runEvalSet().then((results) => {
    console.log("[eval] Completed:", JSON.stringify(results, null, 2));
  }).catch(console.error);
});

app.get("/api/eval/golden-set", async (_req, res) => {
  const { GOLDEN_SET } = await import("./services/eval.js");
  res.json(GOLDEN_SET);
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "providerpilot-api", timestamp: new Date().toISOString() });
});

async function start() {
  await migrate();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[providerpilot] API running on port ${PORT}`);
  });
}

start().catch(console.error);
