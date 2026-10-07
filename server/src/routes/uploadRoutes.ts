import { Router } from "express";
import {
  getUpload,
  deleteUpload,
  listUploads,
  previewAttendanceUpload,
  previewResultUpload,
  processAttendance,
  processResults
} from "../controllers/uploadController.js";
import { excelUpload } from "../middleware/upload.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const uploadRoutes = Router();

uploadRoutes.post("/attendance/preview", excelUpload.single("file"), asyncHandler(previewAttendanceUpload));
uploadRoutes.post("/attendance/process", excelUpload.single("file"), asyncHandler(processAttendance));
uploadRoutes.post("/results/preview", excelUpload.single("file"), asyncHandler(previewResultUpload));
uploadRoutes.post("/results/process", excelUpload.single("file"), asyncHandler(processResults));
uploadRoutes.get("/", asyncHandler(listUploads));
uploadRoutes.get("/:id", asyncHandler(getUpload));
uploadRoutes.delete("/:id", asyncHandler(deleteUpload));
