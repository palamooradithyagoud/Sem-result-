import type { Request, Response } from "express";
import { getStudentAcademicProfile } from "../services/academicProfileService.js";
import { AttendanceRecord } from "../models/AttendanceRecord.js";
import { ResultRecord } from "../models/ResultRecord.js";
import { Student } from "../models/Student.js";
import { Batch } from "../models/Batch.js";
import { pagingSchema } from "../validators/common.js";
import { ApiError } from "../utils/apiError.js";
import { Types } from "mongoose";

export async function getStudentProfile(req: Request, res: Response) {
  const profile = await getStudentAcademicProfile(req.params.id);
  res.json({ data: profile });
}

export async function getStudentPerformanceTrend(req: Request, res: Response) {
  const studentId = req.params.id;
  if (!Types.ObjectId.isValid(studentId)) throw new ApiError(400, "Invalid student identifier.");

  // Aggregate SGPA/CGPA per semester from ResultRecord
  const resultTrend = await ResultRecord.aggregate([
    { $match: { studentId: new Types.ObjectId(studentId), sgpa: { $exists: true, $ne: null } } },
    {
      $group: {
        _id: { semester: "$semester", academicYear: "$academicYear" },
        sgpa: { $max: "$sgpa" },
        cgpa: { $max: "$cgpa" }
      }
    },
    { $sort: { "_id.semester": 1 } }
  ]);

  // Aggregate attendance per semester
  const attendanceTrend = await AttendanceRecord.aggregate([
    { $match: { studentId: new Types.ObjectId(studentId) } },
    {
      $group: {
        _id: { semester: "$semester", academicYear: "$academicYear" },
        totalConducted: { $sum: "$classesConducted" },
        totalAttended: { $sum: "$classesAttended" }
      }
    },
    { $sort: { "_id.semester": 1 } }
  ]);

  // Merge by semester key
  const semesterMap = new Map<string, {
    semester: number;
    academicYear: string;
    sgpa?: number;
    cgpa?: number;
    attendancePercentage?: number;
  }>();

  for (const r of resultTrend) {
    const key = `${r._id.semester}::${r._id.academicYear}`;
    semesterMap.set(key, {
      semester: r._id.semester,
      academicYear: r._id.academicYear,
      sgpa: r.sgpa,
      cgpa: r.cgpa
    });
  }

  for (const a of attendanceTrend) {
    const key = `${a._id.semester}::${a._id.academicYear}`;
    const pct = a.totalConducted > 0
      ? Number(((a.totalAttended / a.totalConducted) * 100).toFixed(2))
      : undefined;
    const existing = semesterMap.get(key);
    if (existing) {
      existing.attendancePercentage = pct;
    } else {
      semesterMap.set(key, {
        semester: a._id.semester,
        academicYear: a._id.academicYear,
        attendancePercentage: pct
      });
    }
  }

  const trend = Array.from(semesterMap.values()).sort((a, b) => a.semester - b.semester);
  res.json({ data: trend });
}

export async function getBatchStudents(req: Request, res: Response) {
  const batchId = req.params.id;
  if (!Types.ObjectId.isValid(batchId)) throw new ApiError(400, "Invalid batch identifier.");

  const batch = await Batch.findById(batchId).lean();
  if (!batch) throw new ApiError(404, "Batch not found.");

  const query = pagingSchema.parse(req.query);
  const filter: Record<string, unknown> = { batchId };
  if (query.search) {
    filter.$or = [
      { rollNumber: new RegExp(query.search, "i") },
      { name: new RegExp(query.search, "i") }
    ];
  }
  if (query.section) filter.currentSection = query.section;
  if (query.year) filter.currentYear = query.year;

  const skip = (query.page - 1) * query.pageSize;
  const [students, total, sections, semesters] = await Promise.all([
    Student.find(filter).sort({ rollNumber: 1 }).skip(skip).limit(query.pageSize).lean(),
    Student.countDocuments(filter),
    Student.distinct("currentSection", { batchId }),
    AttendanceRecord.distinct("semester", { batchId })
  ]);

  // Stats
  const [totalStudents, studentsWithAttendance, studentsWithResults] = await Promise.all([
    Student.countDocuments({ batchId }),
    AttendanceRecord.distinct("studentId", { batchId }).then(ids => ids.length),
    ResultRecord.distinct("studentId", { batchId }).then(ids => ids.length)
  ]);

  res.json({
    data: students,
    meta: { total, page: query.page, pageSize: query.pageSize },
    batchInfo: {
      batch,
      totalStudents,
      sections: sections.filter(Boolean).sort(),
      availableSemesters: semesters.sort((a, b) => a - b),
      studentsWithAttendance,
      studentsWithResults
    }
  });
}

export async function getSectionView(req: Request, res: Response) {
  const query = pagingSchema.parse(req.query);
  const { batchId, semester, academicYear, section } = query;

  if (!batchId) throw new ApiError(400, "batchId is required.");
  if (!semester) throw new ApiError(400, "semester is required.");

  const filter: Record<string, unknown> = { batchId, semester };
  if (academicYear) filter.academicYear = academicYear;
  if (section) filter.section = section;

  // Get distinct students in this section from attendance records
  const studentIds = await AttendanceRecord.distinct("studentId", filter);

  const skip = (query.page - 1) * query.pageSize;
  const [students, total] = await Promise.all([
    Student.find({ _id: { $in: studentIds } })
      .sort({ rollNumber: 1 })
      .skip(skip)
      .limit(query.pageSize)
      .lean(),
    Student.countDocuments({ _id: { $in: studentIds } })
  ]);

  // Aggregate attendance per student for this semester
  const attendanceSummary = await AttendanceRecord.aggregate([
    { $match: { ...filter, studentId: { $in: studentIds.map(id => new Types.ObjectId(id.toString())) } } },
    {
      $group: {
        _id: "$studentId",
        totalConducted: { $sum: "$classesConducted" },
        totalAttended: { $sum: "$classesAttended" }
      }
    }
  ]);

  const attendanceMap = new Map(
    attendanceSummary.map(a => [a._id.toString(), {
      classesConducted: a.totalConducted,
      classesAttended: a.totalAttended,
      percentage: a.totalConducted > 0
        ? Number(((a.totalAttended / a.totalConducted) * 100).toFixed(2))
        : undefined
    }])
  );

  // SGPA per student
  const sgpaSummary = await ResultRecord.aggregate([
    { $match: { ...filter, studentId: { $in: studentIds.map(id => new Types.ObjectId(id.toString())) } } },
    { $group: { _id: "$studentId", sgpa: { $max: "$sgpa" }, cgpa: { $max: "$cgpa" } } }
  ]);
  const sgpaMap = new Map(sgpaSummary.map(r => [r._id.toString(), { sgpa: r.sgpa, cgpa: r.cgpa }]));

  const enriched = students.map(s => ({
    ...s,
    attendance: attendanceMap.get(s._id.toString()),
    performance: sgpaMap.get(s._id.toString())
  }));

  res.json({ data: enriched, meta: { total, page: query.page, pageSize: query.pageSize } });
}

export async function getStudentSemesters(req: Request, res: Response) {
  const profile = await getStudentAcademicProfile(req.params.id);
  res.json({ data: profile.semesters });
}

export async function getStudentAttendance(req: Request, res: Response) {
  const studentId = req.params.id;
  if (!Types.ObjectId.isValid(studentId)) throw new ApiError(400, "Invalid student identifier.");

  const { semester, academicYear, subject } = req.query;
  const filter: Record<string, unknown> = { studentId: new Types.ObjectId(studentId) };
  if (semester) filter.semester = Number(semester);
  if (academicYear) filter.academicYear = academicYear;
  if (subject) {
    filter.$or = [
      { subjectCode: new RegExp(String(subject), "i") },
      { subjectName: new RegExp(String(subject), "i") }
    ];
  }

  const attendance = await AttendanceRecord.find(filter).sort({ semester: 1, subjectName: 1 }).lean();
  res.json({ data: attendance });
}

export async function getStudentResults(req: Request, res: Response) {
  const studentId = req.params.id;
  if (!Types.ObjectId.isValid(studentId)) throw new ApiError(400, "Invalid student identifier.");

  const { semester, academicYear, subject } = req.query;
  const filter: Record<string, unknown> = { studentId: new Types.ObjectId(studentId) };
  if (semester) filter.semester = Number(semester);
  if (academicYear) filter.academicYear = academicYear;
  if (subject) {
    filter.$or = [
      { subjectCode: new RegExp(String(subject), "i") },
      { subjectName: new RegExp(String(subject), "i") }
    ];
  }

  const results = await ResultRecord.find(filter).sort({ semester: 1, subjectName: 1 }).lean();
  res.json({ data: results });
}

export async function getStudentSubjects(req: Request, res: Response) {
  const profile = await getStudentAcademicProfile(req.params.id);
  const { semester } = req.query;
  if (semester) {
    const sem = profile.semesters.find(s => s.semester === Number(semester));
    return res.json({ data: sem ? sem.subjects : [] });
  }
  // All subjects across semesters
  const allSubjects = profile.semesters.flatMap(s => s.subjects);
  res.json({ data: allSubjects });
}

