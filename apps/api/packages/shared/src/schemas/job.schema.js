import { z } from "zod";
import { RoomSchema } from "./room.schema.js";
import { PricingValuesSchema } from "./pricing-profile.schema.js";

export const JobSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  customerName: z.string().default(""),
  propertyAddress: z.string().default(""),
  lossType: z.string().default("unknown"),
  pricingProfileId: z.string().default("default"),
  pricingOverrides: z.record(z.string(), PricingValuesSchema).default({}),
  rooms: z.array(RoomSchema).default([]),
  totals: z.object({
    pack: z.number().default(0),
    clean: z.number().default(0),
    storage: z.number().default(0),
    laborHours: z.number().default(0),
    supplies: z.number().default(0),
    total: z.number().default(0),
  }).default({}),
});
