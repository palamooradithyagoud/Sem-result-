import type { Request, Response } from "express";
import { Student } from "../models/Student.js";
import { AttendanceRecord } from "../models/AttendanceRecord.js";
import { ResultRecord } from "../models/ResultRecord.js";
import { pagingSchema } from "../validators/common.js";

export async function listStudents(req: Request, res: Response) {
  const query = pagingSchema.parse(req.query);
  const filter: Record<string, unknown> = {};

  if (query.batchId) filter.batchId = query.batchId;
  if (query.year) filter.currentYear = query.year;
  if (query.section) filter.currentSection = query.section;
  if (query.department) filter.department = query.department;

  // If filtered by academicYear, semester, or subject, constrain to studentIds with matching records
  if (query.academicYear || query.semester !== undefined || query.subject) {
    const recordFilter: Record<string, unknown> = {};
    if (query.batchId) recordFilter.batchId = query.batchId;
    if (query.academicYear) recordFilter.academicYear = query.academicYear;
    if (query.semester !== undefined) recordFilter.semester = query.semester;
    if (query.department) recordFilter.department = query.department;
    if (query.subject) {
      recordFilter.$or = [
        { subjectCode: new RegExp(query.subject, "i") },
        { subjectName: new RegExp(query.subject, "i") }
      ];
    }

    const [attIds, resIds] = await Promise.all([
      AttendanceRecord.distinct("studentId", recordFilter),
      ResultRecord.distinct("studentId", recordFilter)
    ]);
    const matchedIds = [...new Set([...attIds.map(String), ...resIds.map(String)])];
    filter._id = { $in: matchedIds };
  }

  if (query.search) {
    const term = query.search.trim();
    filter.$or = [
      { rollNumber: new RegExp(term, "i") },
      { name: new RegExp(term, "i") }
    ];
  }

  const skip = (query.page - 1) * query.pageSize;
  let [data, total] = await Promise.all([
    Student.find(filter)
      .populate("batchId", "batchName")
      .sort({ rollNumber: 1 })
      .skip(skip)
      .limit(query.pageSize)
      .lean(),
    Student.countDocuments(filter)
  ]);

  // If exact search term matches rollNumber, prioritize the exact student to top
  if (query.search) {
    const exactTerm = query.search.trim().toUpperCase();
    const exactMatchIndex = data.findIndex(
      (s) => s.rollNumber.toUpperCase() === exactTerm
    );
    if (exactMatchIndex > 0) {
      const [exact] = data.splice(exactMatchIndex, 1);
      data.unshift(exact);
    }
  }

  res.json({ data, meta: { total, page: query.page, pageSize: query.pageSize } });
}

export async function getStudent(req: Request, res: Response) {
  const student = await Student.findById(req.params.id).populate("batchId", "batchName").lean();
  if (!student) {
    return res.status(404).json({ message: "Student was not found." });
  }
  res.json({ data: student });
}

export async function deleteStudent(req: Request, res: Response) {
  const student = await Student.findById(req.params.id);
  if (!student) {
    return res.status(404).json({ message: "Student was not found." });
  }

  const [attRes, resRes] = await Promise.all([
    AttendanceRecord.deleteMany({ studentId: student._id }),
    ResultRecord.deleteMany({ studentId: student._id }),
    Student.findByIdAndDelete(student._id)
  ]);

  res.json({
    message: `Student ${student.rollNumber} and all associated records (${attRes.deletedCount} attendance, ${resRes.deletedCount} results) were deleted successfully.`
  });
}
