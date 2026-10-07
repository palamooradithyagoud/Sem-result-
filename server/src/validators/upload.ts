import { z } from "zod";
import { academicContextSchema } from "./common.js";

export const uploadContextSchema = academicContextSchema.extend({
  dataType: z.enum(["attendance", "results"])
});

export const processUploadSchema = uploadContextSchema.extend({
  duplicateAction: z.enum(["skip", "replace", "cancel"]).default("skip")
});
