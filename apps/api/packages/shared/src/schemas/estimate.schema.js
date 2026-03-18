import { z } from "zod";

export const EstimateLineSchema = z.object({
  itemId: z.string(),
  itemKey: z.string(),
  name: z.string(),
  qty: z.number(),
  unit: z.string().default("ea"),
  pricingSource: z.string(),
  unitPricing: z.object({
    pack: z.number(),
    clean: z.number(),
    storage: z.number(),
    laborHours: z.number(),
    smallBoxes: z.number(),
    mediumBoxes: z.number(),
    largeBoxes: z.number(),
  }),
  totals: z.object({
    pack: z.number(),
    clean: z.number(),
    storage: z.number(),
    laborHours: z.number(),
    smallBoxes: z.number(),
    mediumBoxes: z.number(),
    largeBoxes: z.number(),
  }),
});

export const EstimateSchema = z.object({
  lineItems: z.array(EstimateLineSchema).default([]),
  subtotals: z.object({
    pack: z.number().default(0),
    clean: z.number().default(0),
    storage: z.number().default(0),
    laborHours: z.number().default(0),
    supplies: z.number().default(0),
  }).default({}),
  supplies: z.object({
    smallBoxes: z.number().default(0),
    mediumBoxes: z.number().default(0),
    largeBoxes: z.number().default(0),
    tapeRolls: z.number().default(0),
    bubbleWrapRolls: z.number().default(0),
  }).default({}),
  total: z.number().default(0),
});
