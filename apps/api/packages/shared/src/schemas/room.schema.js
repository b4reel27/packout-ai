import { z } from "zod";
import { ItemSchema } from "./item.schema.js";
import { EstimateSchema } from "./estimate.schema.js";
import { PricingValuesSchema } from "./pricing-profile.schema.js";

export const RoomSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.string().default("unknown"),
  photos: z.array(z.string()).default([]),
  detectedItems: z.array(ItemSchema).default([]),
  pricingOverrides: z.record(z.string(), PricingValuesSchema).default({}),
  estimate: EstimateSchema.optional(),
});
