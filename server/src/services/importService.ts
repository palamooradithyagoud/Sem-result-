import type { FilterQuery, Types } from "mongoose";
import { Batch, type IBatch } from "../models/Batch.js";
import { Student } from "../models/Student.js";
import { Subject } from "../models/Subject.js";
import { Upload } from "../models/Upload.js";
import { AttendanceRecord, type IAttendanceRecord } from "../models/AttendanceRecord.js";
import { ResultRecord, type IResultRecord } from "../models/ResultRecord.js";
import { ApiError } from "../utils/apiError.js";
import { parseAttendanceWorkbook } from "../parsers/attendance/attendanceParser.js";
import { parseResultWorkbook } from "../parsers/results/resultParser.js";
import type { ParsedAttendanceRecord, ParsedResultRecord } from "../parsers/types.js";

export interface UploadContext {
  batchId: string;
  academicYear: string;
  year: string;
  semester: number;
  department: string;
  section?: string;
  dataType: "attendance" | "results";
}

export interface PreviewSummary<T> {
  fileName: string;
  context: UploadContext;
  studentsDetected: number;
  subjectsDetected: number;
  recordsDetected: number;
  validRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  errors: { rowNumber: number; message: string }[];
  records: T[];
}

function assertExcelFile(file?: Express.Multer.File) {
  if (!file) {
    throw new ApiError(400, "Excel file is required.");
  }

  const hasExcelExtension = /\.(xlsx|xlsm|xls)$/i.test(file.originalname);
  if (!hasExcelExtension) {
    throw new ApiError(400, "Only Excel files (.xlsx, .xls) are supported.");
  }
}

function normalizeSection(recordSection?: string, contextSection?: string) {
  return (recordSection || contextSection || "").trim().toUpperCase();
}

function makeRecordKey(rollNumber: string, subjectCode?: string, subjectName?: string) {
  const code = (subjectCode || "").trim().toUpperCase();
  const name = (subjectName || "").trim().toUpperCase();
  return `${rollNumber.trim().toUpperCase()}::${code}::${name}`;
}

async function countAttendanceDuplicates(context: UploadContext, records: ParsedAttendanceRecord[]) {
  const existing = await AttendanceRecord.find({
    batchId: context.batchId,
    academicYear: context.academicYear,
    semester: context.semester
  })
    .select("rollNumber subjectCode subjectName")
    .lean();

  const keySet = new Set(
    existing.map((r) => makeRecordKey(r.rollNumber, r.subjectCode, r.subjectName))
  );

  let count = 0;
  for (const record of records) {
    if (keySet.has(makeRecordKey(record.rollNumber, record.subjectCode, record.subjectName))) {
      count += 1;
    }
  }
  return count;
}

async function countResultDuplicates(context: UploadContext, records: ParsedResultRecord[]) {
  const existing = await ResultRecord.find({
    batchId: context.batchId,
    academicYear: context.academicYear,
    semester: context.semester
  })
    .select("rollNumber subjectCode subjectName")
    .lean();

  const keySet = new Set(
    existing.map((r) => makeRecordKey(r.rollNumber, r.subjectCode, r.subjectName))
  );

  let count = 0;
  for (const record of records) {
    if (keySet.has(makeRecordKey(record.rollNumber, record.subjectCode, record.subjectName))) {
      count += 1;
    }
  }
  return count;
}

export async function previewAttendance(file: Express.Multer.File | undefined, context: UploadContext) {
  assertExcelFile(file);
  const parsed = await parseAttendanceWorkbook(file!.buffer);
  const duplicateRecords = await countAttendanceDuplicates(context, parsed.records);

  return {
    fileName: file!.originalname,
    context,
    studentsDetected: parsed.detectedStudents.length,
    subjectsDetected: parsed.detectedSubjects.length,
    recordsDetected: parsed.records.length + parsed.invalidRecords.length,
    validRecords: parsed.records.length,
    invalidRecords: parsed.invalidRecords.length,
    duplicateRecords,
    errors: parsed.invalidRecords,
    records: parsed.records.slice(0, 200)
  } satisfies PreviewSummary<ParsedAttendanceRecord>;
}

export async function previewResults(file: Express.Multer.File | undefined, context: UploadContext) {
  assertExcelFile(file);
  const parsed = await parseResultWorkbook(file!.buffer);
  const duplicateRecords = await countResultDuplicates(context, parsed.records);

  return {
    fileName: file!.originalname,
    context,
    studentsDetected: parsed.detectedStudents.length,
    subjectsDetected: parsed.detectedSubjects.length,
    recordsDetected: parsed.records.length + parsed.invalidRecords.length,
    validRecords: parsed.records.length,
    invalidRecords: parsed.invalidRecords.length,
    duplicateRecords,
    errors: parsed.invalidRecords,
    records: parsed.records.slice(0, 200)
  } satisfies PreviewSummary<ParsedResultRecord>;
}

async function upsertStudent(
  batch: IBatch | null,
  context: UploadContext,
  rollNumber: string,
  studentName: string,
  section?: string
) {
  if (!batch) throw new ApiError(400, "Selected batch was not found.");

  const existing = await Student.findOne({ rollNumber, batchId: batch._id });
  const finalName =
    existing && existing.name && existing.name !== existing.rollNumber && (!studentName || studentName === rollNumber)
      ? existing.name
      : (studentName || rollNumber);

  return Student.findOneAndUpdate(
    { rollNumber, batchId: batch._id },
    {
      $setOnInsert: {
        rollNumber,
        batchId: batch._id,
        department: context.department,
        program: batch.program,
        admissionYear: batch.startYear,
        graduationYear: batch.endYear
      },
      $set: {
        name: finalName,
        currentYear: context.year,
        currentSection: section || context.section || existing?.currentSection,
        status: "active"
      }
    },
    { upsert: true, new: true }
  );
}

async function upsertSubject(context: UploadContext, record: { subjectCode?: string; subjectName: string; credits?: number }) {
  const code = (record.subjectCode || "").trim().toUpperCase();
  const name = record.subjectName.trim();

  return Subject.findOneAndUpdate(
    {
      subjectCode: code,
      subjectName: name,
      department: context.department,
      academicYear: context.academicYear,
      semester: context.semester
    },
    {
      $setOnInsert: {
        subjectCode: code || undefined,
        subjectName: name,
        department: context.department,
        academicYear: context.academicYear,
        semester: context.semester,
        year: context.year,
        credits: record.credits
      }
    },
    { upsert: true, new: true }
  );
}

export async function processAttendanceUpload(
  file: Express.Multer.File | undefined,
  context: UploadContext,
  uploadedBy: string,
  duplicateAction: "skip" | "replace" | "cancel"
) {
  assertExcelFile(file);
  const parsed = await parseAttendanceWorkbook(file!.buffer);
  const duplicateRows = await countAttendanceDuplicates(context, parsed.records);

  if (duplicateRows > 0 && duplicateAction === "cancel") {
    throw new ApiError(409, "Duplicate records were detected. Choose skip, replace, or cancel.");
  }

  const upload = await Upload.create({
    fileName: file!.originalname,
    ...context,
    uploadedBy,
    status: "processing",
    totalRows: parsed.records.length + parsed.invalidRecords.length,
    failedRows: parsed.invalidRecords.length,
    duplicateRows,
    errorMessages: parsed.invalidRecords.map((issue) => `Row ${issue.rowNumber}: ${issue.message}`)
  });

  const batch = await Batch.findById(context.batchId);
  if (!batch) throw new ApiError(400, "Selected batch was not found.");

  // Pre-cache students and subjects to avoid duplicate round-trips
  const studentCache = new Map<string, Types.ObjectId>();
  const subjectCache = new Map<string, Types.ObjectId>();

  // Find existing records map for fast duplicate lookup
  const existingRecords = await AttendanceRecord.find({
    batchId: context.batchId,
    academicYear: context.academicYear,
    semester: context.semester
  }).select("_id rollNumber subjectCode subjectName").lean();

  const existingMap = new Map(
    existingRecords.map((r) => [makeRecordKey(r.rollNumber, r.subjectCode, r.subjectName), r._id])
  );

  const bulkOps: any[] = [];
  let processedRows = 0;

  for (const record of parsed.records) {
    const key = makeRecordKey(record.rollNumber, record.subjectCode, record.subjectName);
    const existingId = existingMap.get(key);

    if (existingId && duplicateAction === "skip") {
      continue;
    }

    const section = normalizeSection(record.section, context.section);

    let studentId = studentCache.get(record.rollNumber);
    if (!studentId) {
      const student = await upsertStudent(batch, context, record.rollNumber, record.studentName, section);
      studentId = student._id;
      studentCache.set(record.rollNumber, studentId);
    }

    const subjKey = `${(record.subjectCode || "").trim().toUpperCase()}::${record.subjectName.trim().toUpperCase()}`;
    let subjectId = subjectCache.get(subjKey);
    if (!subjectId) {
      const subject = await upsertSubject(context, record);
      subjectId = subject._id;
      subjectCache.set(subjKey, subjectId);
    }

    const payload = {
      studentId,
      rollNumber: record.rollNumber,
      batchId: context.batchId,
      academicYear: context.academicYear,
      year: context.year,
      semester: context.semester,
      department: context.department,
      section,
      subjectId,
      subjectCode: record.subjectCode || "",
      subjectName: record.subjectName,
      classesConducted: record.classesConducted,
      classesAttended: record.classesAttended,
      attendancePercentage: record.attendancePercentage,
      sourceUploadId: upload._id
    };

    if (existingId && duplicateAction === "replace") {
      bulkOps.push({
        updateOne: {
          filter: { _id: existingId },
          update: { $set: payload }
        }
      });
    } else {
      bulkOps.push({
        insertOne: {
          document: payload
        }
      });
    }
    processedRows += 1;
  }

  if (bulkOps.length > 0) {
    await AttendanceRecord.bulkWrite(bulkOps, { ordered: false });
  }

  upload.processedRows = processedRows;
  upload.status = parsed.invalidRecords.length > 0 ? "partially_processed" : "processed";
  upload.completedAt = new Date();
  await upload.save();
  return upload;
}

export async function processResultUpload(
  file: Express.Multer.File | undefined,
  context: UploadContext,
  uploadedBy: string,
  duplicateAction: "skip" | "replace" | "cancel"
) {
  assertExcelFile(file);
  const parsed = await parseResultWorkbook(file!.buffer);
  const duplicateRows = await countResultDuplicates(context, parsed.records);

  if (duplicateRows > 0 && duplicateAction === "cancel") {
    throw new ApiError(409, "Duplicate records were detected. Choose skip, replace, or cancel.");
  }

  const upload = await Upload.create({
    fileName: file!.originalname,
    ...context,
    uploadedBy,
    status: "processing",
    totalRows: parsed.records.length + parsed.invalidRecords.length,
    failedRows: parsed.invalidRecords.length,
    duplicateRows,
    errorMessages: parsed.invalidRecords.map((issue) => `Row ${issue.rowNumber}: ${issue.message}`)
  });

  const batch = await Batch.findById(context.batchId);
  if (!batch) throw new ApiError(400, "Selected batch was not found.");

  const studentCache = new Map<string, Types.ObjectId>();
  const subjectCache = new Map<string, Types.ObjectId>();

  const existingRecords = await ResultRecord.find({
    batchId: context.batchId,
    academicYear: context.academicYear,
    semester: context.semester
  }).select("_id rollNumber subjectCode subjectName").lean();

  const existingMap = new Map(
    existingRecords.map((r) => [makeRecordKey(r.rollNumber, r.subjectCode, r.subjectName), r._id])
  );

  const bulkOps: any[] = [];
  let processedRows = 0;

  for (const record of parsed.records) {
    const key = makeRecordKey(record.rollNumber, record.subjectCode, record.subjectName);
    const existingId = existingMap.get(key);

    if (existingId && duplicateAction === "skip") {
      continue;
    }

    const section = normalizeSection(record.section, context.section);

    let studentId = studentCache.get(record.rollNumber);
    if (!studentId) {
      const student = await upsertStudent(batch, context, record.rollNumber, record.studentName, section);
      studentId = student._id;
      studentCache.set(record.rollNumber, studentId);
    }

    const subjKey = `${(record.subjectCode || "").trim().toUpperCase()}::${record.subjectName.trim().toUpperCase()}`;
    let subjectId = subjectCache.get(subjKey);
    if (!subjectId) {
      const subject = await upsertSubject(context, record);
      subjectId = subject._id;
      subjectCache.set(subjKey, subjectId);
    }

    const payload = {
      studentId,
      rollNumber: record.rollNumber,
      batchId: context.batchId,
      academicYear: context.academicYear,
      year: context.year,
      semester: context.semester,
      department: context.department,
      section,
      subjectId,
      subjectCode: record.subjectCode || "",
      subjectName: record.subjectName,
      grade: record.grade,
      gradePoint: record.gradePoint,
      credits: record.credits,
      sgpa: record.sgpa,
      cgpa: record.cgpa,
      backlog: record.backlog,
      resultStatus: record.resultStatus,
      sourceUploadId: upload._id
    };

    if (existingId && duplicateAction === "replace") {
      bulkOps.push({
        updateOne: {
          filter: { _id: existingId },
          update: { $set: payload }
        }
      });
    } else {
      bulkOps.push({
        insertOne: {
          document: payload
        }
      });
    }
    processedRows += 1;
  }

  if (bulkOps.length > 0) {
    await ResultRecord.bulkWrite(bulkOps, { ordered: false });
  }

  upload.processedRows = processedRows;
  upload.status = parsed.invalidRecords.length > 0 ? "partially_processed" : "processed";
  upload.completedAt = new Date();
  await upload.save();
  return upload;
}
