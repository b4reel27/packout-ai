import { z } from "zod";

export const PricingValuesSchema = z.object({
  pack: z.number().min(0).default(0),
  clean: z.number().min(0).default(0),
  storage: z.number().min(0).default(0),
  laborHours: z.number().min(0).default(0),
  smallBoxes: z.number().min(0).default(0),
  mediumBoxes: z.number().min(0).default(0),
  largeBoxes: z.number().min(0).default(0),
});

export const PricingLineSchema = z.object({
  itemKey: z.string().min(1),
  displayName: z.string().min(1),
  unit: z.string().default("ea"),
  pricing: PricingValuesSchema,
  taxable: z.boolean().default(false),
  externalMappings: z.object({
    xactimate: z.string().default(""),
    cotality: z.string().default(""),
    magicplan: z.string().default(""),
    jobber: z.string().default(""),
  }).default({}),
});

export const PricingProfileSchema = z.object({
  id: z.string(),
  companyId: z.string().default("system"),
  name: z.string().min(1),
  isDefault: z.boolean().default(false),
  lines: z.array(PricingLineSchema).default([]),
});
