import type { Request, Response } from "express";
import { Batch } from "../models/Batch.js";
import { Student } from "../models/Student.js";
import { AttendanceRecord } from "../models/AttendanceRecord.js";
import { ResultRecord } from "../models/ResultRecord.js";
import { batchSchema, updateBatchSchema } from "../validators/batch.js";

export async function listBatches(_req: Request, res: Response) {
  const batches = await Batch.find().sort({ startYear: -1, department: 1 }).lean();
  res.json({ data: batches });
}

export async function createBatch(req: Request, res: Response) {
  const body = batchSchema.parse(req.body);
  const batch = await Batch.create(body);
  res.status(201).json({ data: batch });
}

export async function getBatch(req: Request, res: Response) {
  const batch = await Batch.findById(req.params.id).lean();
  if (!batch) {
    return res.status(404).json({ message: "Batch was not found." });
  }
  res.json({ data: batch });
}

export async function updateBatch(req: Request, res: Response) {
  const body = updateBatchSchema.parse(req.body);
  const batch = await Batch.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
  if (!batch) {
    return res.status(404).json({ message: "Batch was not found." });
  }
  res.json({ data: batch });
}

export async function deleteBatch(req: Request, res: Response) {
  const batch = await Batch.findById(req.params.id);
  if (!batch) {
    return res.status(404).json({ message: "Batch was not found." });
  }

  const [studRes, attRes, resRes] = await Promise.all([
    Student.deleteMany({ batchId: batch._id }),
    AttendanceRecord.deleteMany({ batchId: batch._id }),
    ResultRecord.deleteMany({ batchId: batch._id }),
    Batch.findByIdAndDelete(batch._id)
  ]);

  res.json({
    message: `Batch "${batch.batchName}" and all associated data were deleted successfully.`
  });
}
