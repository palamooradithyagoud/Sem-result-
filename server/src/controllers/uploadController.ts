import type { Request, Response } from "express";
import { Upload } from "../models/Upload.js";
import { AttendanceRecord } from "../models/AttendanceRecord.js";
import { ResultRecord } from "../models/ResultRecord.js";
import { uploadContextSchema, processUploadSchema } from "../validators/upload.js";
import {
  previewAttendance,
  previewResults,
  processAttendanceUpload,
  processResultUpload,
  type UploadContext
} from "../services/importService.js";
import { ApiError } from "../utils/apiError.js";

export async function previewAttendanceUpload(req: Request, res: Response) {
  const context = uploadContextSchema.parse({ ...req.body, dataType: "attendance" }) as UploadContext;
  if (!context.section) {
    throw new ApiError(400, "Section is required for attendance uploads.");
  }
  const preview = await previewAttendance(req.file, context);
  res.json({ data: preview });
}

export async function previewResultUpload(req: Request, res: Response) {
  const context = uploadContextSchema.parse({ ...req.body, dataType: "results" }) as UploadContext;
  const preview = await previewResults(req.file, context);
  res.json({ data: preview });
}

export async function processAttendance(req: Request, res: Response) {
  if (!req.user) throw new ApiError(401, "Authentication is required.");
  const context = processUploadSchema.parse({ ...req.body, dataType: "attendance" });
  if (!context.section) {
    throw new ApiError(400, "Section is required for attendance uploads.");
  }
  const upload = await processAttendanceUpload(req.file, context, req.user.id, context.duplicateAction);
  res.status(201).json({ data: upload });
}

export async function processResults(req: Request, res: Response) {
  if (!req.user) throw new ApiError(401, "Authentication is required.");
  const context = processUploadSchema.parse({ ...req.body, dataType: "results" });
  const upload = await processResultUpload(req.file, context, req.user.id, context.duplicateAction);
  res.status(201).json({ data: upload });
}

export async function listUploads(req: Request, res: Response) {
  const page = Number(req.query.page || 1);
  const pageSize = Math.min(Number(req.query.pageSize || 20), 100);
  const skip = (page - 1) * pageSize;
  const [data, total] = await Promise.all([
    Upload.find().populate("batchId", "batchName").sort({ uploadedAt: -1 }).skip(skip).limit(pageSize).lean(),
    Upload.countDocuments()
  ]);
  res.json({ data, meta: { total, page, pageSize } });
}

export async function getUpload(req: Request, res: Response) {
  const upload = await Upload.findById(req.params.id).populate("batchId", "batchName").lean();
  if (!upload) {
    return res.status(404).json({ message: "Upload was not found." });
  }
  res.json({ data: upload });
}

export async function deleteUpload(req: Request, res: Response) {
  const upload = await Upload.findById(req.params.id);
  if (!upload) {
    throw new ApiError(404, "Upload was not found.");
  }

  let deletedRecords = 0;
  if (upload.dataType === "attendance") {
    const result = await AttendanceRecord.deleteMany({ sourceUploadId: upload._id });
    deletedRecords = result.deletedCount || 0;
  } else if (upload.dataType === "results") {
    const result = await ResultRecord.deleteMany({ sourceUploadId: upload._id });
    deletedRecords = result.deletedCount || 0;
  }

  await Upload.findByIdAndDelete(upload._id);

  res.json({
    message: `Upload "${upload.fileName}" and ${deletedRecords} associated records were deleted successfully.`,
    data: { deletedRecords, uploadId: upload._id }
  });
}
