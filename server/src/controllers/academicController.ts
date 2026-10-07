import type { Request, Response } from "express";
import { Batch } from "../models/Batch.js";
import { AttendanceRecord } from "../models/AttendanceRecord.js";
import { ResultRecord } from "../models/ResultRecord.js";
import { Student } from "../models/Student.js";
import { Subject } from "../models/Subject.js";

/**
 * Returns dynamic dependent filter options:
 * - Batches
 * - Academic Years (filtered by batchId if supplied)
 * - Semesters (filtered by batchId and academicYear if supplied)
 * - Sections (filtered by batchId, year, etc.)
 * - Departments
 * - Subjects (filtered by batchId, semester, etc.)
 */
export async function getFilterOptions(req: Request, res: Response) {
  const { batchId, academicYear, semester, department } = req.query as Record<string, string>;

  const batchFilter: Record<string, unknown> = {};
  if (department) batchFilter.department = department;

  const batches = await Batch.find(batchFilter).sort({ startYear: -1, batchName: 1 }).lean();

  const recordFilter: Record<string, unknown> = {};
  if (batchId) recordFilter.batchId = batchId;
  if (department) recordFilter.department = department;

  // Distinct academic years
  const [attYears, resYears] = await Promise.all([
    AttendanceRecord.distinct("academicYear", recordFilter),
    ResultRecord.distinct("academicYear", recordFilter)
  ]);
  const academicYears = [...new Set([...attYears, ...resYears])].filter(Boolean).sort();

  // If academicYear is also supplied, narrow recordFilter for semesters
  const semFilter = { ...recordFilter };
  if (academicYear) semFilter.academicYear = academicYear;

  const [attSems, resSems] = await Promise.all([
    AttendanceRecord.distinct("semester", semFilter),
    ResultRecord.distinct("semester", semFilter)
  ]);
  const semesters = [...new Set([...attSems, ...resSems])].filter(Boolean).sort((a, b) => a - b);

  // Sections
  const studentFilter: Record<string, unknown> = {};
  if (batchId) studentFilter.batchId = batchId;
  if (department) studentFilter.department = department;

  const [studentSections, attSections] = await Promise.all([
    Student.distinct("currentSection", studentFilter),
    AttendanceRecord.distinct("section", semFilter)
  ]);
  const sections = [...new Set([...studentSections, ...attSections])].filter(Boolean).sort();

  // Departments
  const departments = await Student.distinct("department").then(d => d.filter(Boolean).sort());

  // Subjects (aggregated)
  const subjFilter: Record<string, unknown> = { ...semFilter };
  if (semester) subjFilter.semester = Number(semester);

  const [attSubjects, resSubjects] = await Promise.all([
    AttendanceRecord.aggregate([
      { $match: subjFilter },
      { $group: { _id: { subjectCode: "$subjectCode", subjectName: "$subjectName" } } },
      { $limit: 100 }
    ]),
    ResultRecord.aggregate([
      { $match: subjFilter },
      { $group: { _id: { subjectCode: "$subjectCode", subjectName: "$subjectName" } } },
      { $limit: 100 }
    ])
  ]);

  const subjectMap = new Map<string, { subjectCode?: string; subjectName: string }>();
  for (const s of [...attSubjects, ...resSubjects]) {
    const code = s._id?.subjectCode;
    const name = s._id?.subjectName;
    if (!name && !code) continue;
    const key = (code || name).trim().toUpperCase();
    if (!subjectMap.has(key)) {
      subjectMap.set(key, { subjectCode: code, subjectName: name || code });
    }
  }

  res.json({
    data: {
      batches,
      academicYears,
      semesters,
      sections,
      departments,
      subjects: Array.from(subjectMap.values())
    }
  });
}

/**
 * GET /api/academic/semesters
 */
export async function getAcademicSemesters(req: Request, res: Response) {
  const { batchId, academicYear } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};
  if (batchId) filter.batchId = batchId;
  if (academicYear) filter.academicYear = academicYear;

  const [attSems, resSems] = await Promise.all([
    AttendanceRecord.distinct("semester", filter),
    ResultRecord.distinct("semester", filter)
  ]);
  const semesters = [...new Set([...attSems, ...resSems])].filter(Boolean).sort((a, b) => a - b);
  res.json({ data: semesters });
}

/**
 * GET /api/academic/subjects
 */
export async function getAcademicSubjects(req: Request, res: Response) {
  const { batchId, semester, academicYear } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};
  if (batchId) filter.batchId = batchId;
  if (semester) filter.semester = Number(semester);
  if (academicYear) filter.academicYear = academicYear;

  const subjects = await Subject.find(filter).sort({ code: 1, name: 1 }).lean();
  res.json({ data: subjects });
}
