import { Router, Request, Response } from "express";
import { intakeSchema } from "../schemas.js";
import { runPipeline } from "../services/pipeline.js";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const parsed = intakeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const onboardingId = await runPipeline(parsed.data);
    res.json({ onboardingId, status: "started" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
