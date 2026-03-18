import { z } from "zod";

export const CompanySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional().default(""),
  defaultPricingProfileId: z.string().optional().default("default"),
  settings: z.object({
    currency: z.string().default("USD"),
    storageMonthsDefault: z.number().min(0).default(1),
    allowJobLevelPricingOverrides: z.boolean().default(true),
    allowItemLevelPricingOverrides: z.boolean().default(true),
  }).default({}),
});
