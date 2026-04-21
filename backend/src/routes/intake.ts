import { Router, Request, Response } from "express";
import { runPipeline } from "../services/pipeline.js";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { providerName, businessName, state, address, phone, email, facilityType, ageGroups, maxCapacity } = req.body;

    if (!providerName || !state) {
      res.status(400).json({ error: "providerName and state are required" });
      return;
    }

    const onboardingId = await runPipeline({
      providerName,
      businessName,
      state: state.toUpperCase(),
      address,
      phone,
      email,
      facilityType,
      ageGroups,
      maxCapacity,
    });

    res.json({ onboardingId, status: "started" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ error: message });
  }
});

export default router;
