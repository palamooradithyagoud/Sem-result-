import type { Request, Response } from "express";
import { AttendanceRecord } from "../models/AttendanceRecord.js";
import { ResultRecord } from "../models/ResultRecord.js";
import { pagingSchema } from "../validators/common.js";
import { ApiError } from "../utils/apiError.js";

function buildRecordFilter(query: ReturnType<typeof pagingSchema.parse>) {
  const filter: Record<string, unknown> = {};
  if (query.batchId) filter.batchId = query.batchId;
  if (query.academicYear) filter.academicYear = query.academicYear;
  if (query.year) filter.year = query.year;
  if (query.semester) filter.semester = query.semester;
  if (query.department) filter.department = query.department;
  if (query.section) filter.section = query.section;
  if (query.subject) {
    filter.$or = [
      { subjectName: new RegExp(query.subject, "i") },
      { subjectCode: new RegExp(query.subject, "i") }
    ];
  }
  if (query.search) {
    filter.$or = [
      { rollNumber: new RegExp(query.search, "i") },
      { subjectName: new RegExp(query.search, "i") }
    ];
  }
  return filter;
}

export async function listAttendance(req: Request, res: Response) {
  const query = pagingSchema.parse(req.query);
  const filter = buildRecordFilter(query);
  const skip = (query.page - 1) * query.pageSize;
  const [data, total] = await Promise.all([
    AttendanceRecord.find(filter)
      .populate("studentId", "name")
      .populate("batchId", "batchName")
      .sort({ rollNumber: 1, subjectName: 1 })
      .skip(skip)
      .limit(query.pageSize)
      .lean(),
    AttendanceRecord.countDocuments(filter)
  ]);
  res.json({ data, meta: { total, page: query.page, pageSize: query.pageSize } });
}

export async function listResults(req: Request, res: Response) {
  const query = pagingSchema.parse(req.query);
  const filter = buildRecordFilter(query);
  const skip = (query.page - 1) * query.pageSize;
  const [data, total] = await Promise.all([
    ResultRecord.find(filter)
      .populate("studentId", "name")
      .populate("batchId", "batchName")
      .sort({ rollNumber: 1, subjectName: 1 })
      .skip(skip)
      .limit(query.pageSize)
      .lean(),
    ResultRecord.countDocuments(filter)
  ]);
  res.json({ data, meta: { total, page: query.page, pageSize: query.pageSize } });
}

export async function deleteAttendanceRecord(req: Request, res: Response) {
  const record = await AttendanceRecord.findByIdAndDelete(req.params.id);
  if (!record) {
    throw new ApiError(404, "Attendance record not found.");
  }
  res.json({ message: "Attendance record deleted successfully." });
}

export async function deleteResultRecord(req: Request, res: Response) {
  const record = await ResultRecord.findByIdAndDelete(req.params.id);
  if (!record) {
    throw new ApiError(404, "Result record not found.");
  }
  res.json({ message: "Result record deleted successfully." });
}
