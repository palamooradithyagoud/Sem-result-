import { z } from "zod";

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier.");

export const academicContextSchema = z.object({
  batchId: objectIdSchema,
  academicYear: z.string().trim().min(1),
  year: z.string().trim().min(1),
  semester: z.coerce.number().int().min(1).max(12),
  department: z.string().trim().min(1),
  section: z.string().trim().optional()
});

export const pagingSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  batchId: z.string().trim().optional(),
  academicYear: z.string().trim().optional(),
  year: z.string().trim().optional(),
  semester: z.coerce.number().int().optional(),
  department: z.string().trim().optional(),
  section: z.string().trim().optional(),
  subject: z.string().trim().optional()
});
