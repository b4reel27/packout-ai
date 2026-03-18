import { z } from "zod";
import { PricingValuesSchema } from "./pricing-profile.schema.js";

export const ItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  itemKey: z.string().min(1),
  qty: z.number().int().positive().default(1),
  category: z.string().default("misc"),
  size: z.enum(["small", "medium", "large", "oversize"]).default("medium"),
  fragile: z.boolean().default(false),
  highValue: z.boolean().default(false),
  condition: z.enum([
    "undamaged",
    "water_affected",
    "smoke_affected",
    "soot_affected",
    "unknown",
  ]).default("unknown"),
  confidence: z.number().min(0).max(1).default(0.75),
  notes: z.string().default(""),
  pricingOverride: PricingValuesSchema.optional(),
});
