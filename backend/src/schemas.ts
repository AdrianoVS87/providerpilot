import { z } from "zod";

export const VALID_STATES = ["CA", "TX", "FL", "NY", "MI", "NV", "IN", "OH", "GA", "IL"] as const;

export const intakeSchema = z.object({
  providerName: z.string().min(2).max(200),
  businessName: z.string().max(200).optional(),
  state: z.enum(VALID_STATES),
  address: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  facilityType: z.enum(["home-based", "center-based", "group-home"]).default("home-based"),
  ageGroups: z.array(z.enum(["infant", "toddler", "preschool", "school-age"])).default([]),
  maxCapacity: z.number().int().min(1).max(200).optional(),
});

export const reviewSchema = z.object({
  action: z.enum(["approve", "reject", "edit"]),
  // Draft edits can include full JSON payloads; keep practical but safe limit
  notes: z.string().max(20000).optional(),
  stepId: z.string().uuid().optional(),
});

export type IntakeData = z.infer<typeof intakeSchema>;
export type ReviewData = z.infer<typeof reviewSchema>;
