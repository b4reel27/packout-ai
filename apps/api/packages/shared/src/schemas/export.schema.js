import { z } from "zod";

export const ExportSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  exporter: z.string(),
  mode: z.string().default("file"),
  fileName: z.string().default(""),
  payload: z.any(),
  createdAt: z.string(),
});
