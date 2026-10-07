import { Types } from "mongoose";
import { AttendanceRecord } from "../models/AttendanceRecord.js";
import { ResultRecord } from "../models/ResultRecord.js";
import { Student } from "../models/Student.js";
import { ApiError } from "../utils/apiError.js";

export interface SubjectMapping {
  subjectCode: string;
  subjectName: string;
  // Attendance side
  classesConducted?: number;
  classesAttended?: number;
  attendancePercentage?: number;
  hasAttendance: boolean;
  // Result side
  grade?: string;
  gradePoint?: number;
  credits?: number;
  resultStatus?: string;
  hasResult: boolean;
}

export interface SemesterSummary {
  semester: number;
  academicYear: string;
  year: string;
  sgpa?: number;
  cgpa?: number;
  attendancePercentage?: number;
  classesConducted?: number;
  classesAttended?: number;
  backlogs: number;
  resultStatus?: string;
  subjects: SubjectMapping[];
}

export interface StudentAcademicProfile {
  student: {
    _id: string;
    rollNumber: string;
    name: string;
    batchId: { _id: string; batchName: string; department: string; program: string };
    department: string;
    program: string;
    admissionYear: number;
    graduationYear: number;
    currentYear: string;
    currentSection?: string;
    status: string;
  };
  semesters: SemesterSummary[];
  overallCgpa?: number;
  overallAttendancePercentage?: number;
  totalClassesConducted: number;
  totalClassesAttended: number;
}

function subjectKey(code: string | undefined, name: string): string {
  return (code && code.trim()) ? code.trim().toUpperCase() : name.trim().toUpperCase();
}

export async function getStudentAcademicProfile(studentId: string): Promise<StudentAcademicProfile> {
  if (!Types.ObjectId.isValid(studentId)) {
    throw new ApiError(400, "Invalid student identifier.");
  }

  const student = await Student.findById(studentId)
    .populate<{ batchId: { _id: string; batchName: string; department: string; program: string } }>(
      "batchId",
      "batchName department program"
    )
    .lean();

  if (!student) throw new ApiError(404, "Student not found.");

  // Fetch all attendance and result records for this student
  const [attendanceRecords, resultRecords] = await Promise.all([
    AttendanceRecord.find({ studentId: student._id }).lean(),
    ResultRecord.find({ studentId: student._id }).lean()
  ]);

  // Group by semester key: "semester:academicYear"
  const semesterMap = new Map<string, {
    semester: number;
    academicYear: string;
    year: string;
    attendance: typeof attendanceRecords;
    results: typeof resultRecords;
  }>();

  for (const a of attendanceRecords) {
    const key = `${a.semester}::${a.academicYear}`;
    if (!semesterMap.has(key)) {
      semesterMap.set(key, { semester: a.semester, academicYear: a.academicYear, year: a.year, attendance: [], results: [] });
    }
    semesterMap.get(key)!.attendance.push(a);
  }

  for (const r of resultRecords) {
    const key = `${r.semester}::${r.academicYear}`;
    if (!semesterMap.has(key)) {
      semesterMap.set(key, { semester: r.semester, academicYear: r.academicYear, year: r.year, attendance: [], results: [] });
    }
    semesterMap.get(key)!.results.push(r);
  }

  // Build semester summaries
  const semesters: SemesterSummary[] = [];

  for (const [, data] of semesterMap) {
    // Build subject map
    const subjectMap = new Map<string, SubjectMapping>();

    for (const a of data.attendance) {
      const key = subjectKey(a.subjectCode, a.subjectName);
      subjectMap.set(key, {
        subjectCode: a.subjectCode || "",
        subjectName: a.subjectName,
        classesConducted: a.classesConducted,
        classesAttended: a.classesAttended,
        attendancePercentage: a.attendancePercentage,
        hasAttendance: true,
        hasResult: false
      });
    }

    for (const r of data.results) {
      const key = subjectKey(r.subjectCode, r.subjectName);
      const existing = subjectMap.get(key);
      if (existing) {
        existing.grade = r.grade;
        existing.gradePoint = r.gradePoint;
        existing.credits = r.credits;
        existing.resultStatus = r.resultStatus;
        existing.hasResult = true;
      } else {
        subjectMap.set(key, {
          subjectCode: r.subjectCode || "",
          subjectName: r.subjectName,
          grade: r.grade,
          gradePoint: r.gradePoint,
          credits: r.credits,
          resultStatus: r.resultStatus,
          hasAttendance: false,
          hasResult: true
        });
      }
    }

    // Aggregate semester attendance
    const totalConducted = data.attendance.reduce((s, a) => s + a.classesConducted, 0);
    const totalAttended = data.attendance.reduce((s, a) => s + a.classesAttended, 0);
    const attendancePct = totalConducted > 0
      ? Number(((totalAttended / totalConducted) * 100).toFixed(2))
      : undefined;

    // SGPA/CGPA — pick from any result record (they should be the same per semester per student)
    const resultWithSgpa = data.results.find(r => r.sgpa !== undefined);
    const backlogs = data.results.filter(r => r.backlog === true).length;

    semesters.push({
      semester: data.semester,
      academicYear: data.academicYear,
      year: data.year,
      sgpa: resultWithSgpa?.sgpa,
      cgpa: resultWithSgpa?.cgpa,
      attendancePercentage: attendancePct,
      classesConducted: totalConducted || undefined,
      classesAttended: totalAttended || undefined,
      backlogs,
      resultStatus: resultWithSgpa?.resultStatus,
      subjects: Array.from(subjectMap.values()).sort((a, b) =>
        a.subjectCode.localeCompare(b.subjectCode) || a.subjectName.localeCompare(b.subjectName)
      )
    });
  }

  // Sort semesters
  semesters.sort((a, b) => a.semester - b.semester || a.academicYear.localeCompare(b.academicYear));

  // Overall stats
  const allAttendance = attendanceRecords;
  const totalConducted = allAttendance.reduce((s, a) => s + a.classesConducted, 0);
  const totalAttended = allAttendance.reduce((s, a) => s + a.classesAttended, 0);
  const overallAttendancePct = totalConducted > 0
    ? Number(((totalAttended / totalConducted) * 100).toFixed(2))
    : undefined;

  // Latest CGPA
  const latestWithCgpa = [...resultRecords]
    .sort((a, b) => b.semester - a.semester)
    .find(r => r.cgpa !== undefined);

  return {
    student: student as unknown as StudentAcademicProfile["student"],
    semesters,
    overallCgpa: latestWithCgpa?.cgpa,
    overallAttendancePercentage: overallAttendancePct,
    totalClassesConducted: totalConducted,
    totalClassesAttended: totalAttended
  };
}

export async function getStudentSemesterDetail(
  studentId: string,
  semester: number,
  academicYear: string
) {
  if (!Types.ObjectId.isValid(studentId)) throw new ApiError(400, "Invalid student identifier.");

  const [attendance, results] = await Promise.all([
    AttendanceRecord.find({ studentId, semester, academicYear }).lean(),
    ResultRecord.find({ studentId, semester, academicYear }).lean()
  ]);

  return { attendance, results };
}
