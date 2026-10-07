import type { Request, Response } from "express";
import { AttendanceRecord } from "../models/AttendanceRecord.js";
import { Batch } from "../models/Batch.js";
import { ResultRecord } from "../models/ResultRecord.js";
import { Student } from "../models/Student.js";
import { Upload } from "../models/Upload.js";

export async function getDashboardSummary(_req: Request, res: Response) {
  const [
    totalStudents,
    totalBatches,
    attendanceRecords,
    resultRecords,
    studentSections,
    attendanceSections,
    resultSections,
    uploads,
    uploadedSemesters
  ] = await Promise.all([
    Student.countDocuments(),
    Batch.countDocuments(),
    AttendanceRecord.countDocuments(),
    ResultRecord.countDocuments(),
    Student.distinct("currentSection"),
    AttendanceRecord.distinct("section"),
    ResultRecord.distinct("section"),
    Upload.find().sort({ uploadedAt: -1 }).limit(6).populate("batchId", "batchName").lean(),
    Upload.distinct("semester", { status: { $in: ["processed", "partially_processed"] } })
  ]);

  const sections = new Set(
    [...studentSections, ...attendanceSections, ...resultSections].filter((section) => Boolean(section))
  );

  res.json({
    data: {
      totalStudents,
      totalBatches,
      totalSections: sections.size,
      uploadedSemesters: uploadedSemesters.length,
      attendanceRecords,
      resultRecords,
      recentUploads: uploads
    }
  });
}
