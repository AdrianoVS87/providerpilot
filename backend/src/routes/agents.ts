import { Router, Request, Response } from "express";
import { getAgents, getAgent } from "../services/paperclip.js";
import { heartbeatCheck } from "../services/minimax.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const agentIds = JSON.parse(readFileSync(join(__dirname, "../../agent-ids.json"), "utf-8"));

const router = Router();
const COMPANY_ID = agentIds.companyId;

// GET /api/agents — all 40 agents with status
router.get("/", async (_req: Request, res: Response) => {
  try {
    const agents = await getAgents(COMPANY_ID);
    res.json(agents);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch agents";
    res.status(500).json({ error: message });
  }
});

// GET /api/agents/:id — single agent detail
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const agent = await getAgent(COMPANY_ID, req.params.id);
    res.json(agent);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch agent";
    res.status(500).json({ error: message });
  }
});

// POST /agents/:agentName/heartbeat — called by Paperclip
router.post("/:agentName/heartbeat", async (req: Request, res: Response) => {
  const { agentName } = req.params;
  try {
    const status = await heartbeatCheck(
      agentName,
      req.body?.title || agentName,
      req.body?.context || "No active tasks"
    );
    res.json({ agent: agentName, status, timestamp: new Date().toISOString() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Heartbeat failed";
    res.json({ agent: agentName, status: `Heartbeat error: ${message}`, timestamp: new Date().toISOString() });
  }
});

export default router;
