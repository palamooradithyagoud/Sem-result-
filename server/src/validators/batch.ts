import { z } from "zod";

const batchBaseSchema = z.object({
  batchName: z.string().trim().min(1),
  startYear: z.coerce.number().int().min(1900),
  endYear: z.coerce.number().int().min(1900),
  department: z.string().trim().min(1),
  program: z.string().trim().min(1),
  duration: z.coerce.number().int().min(1).max(10),
  status: z.enum(["active", "archived"]).default("active")
});

export const batchSchema = batchBaseSchema.refine((value) => value.endYear > value.startYear, {
  message: "End year must be later than start year.",
  path: ["endYear"]
});

export const updateBatchSchema = batchBaseSchema.partial();
