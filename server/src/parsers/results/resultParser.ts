import { detectHeaderRow } from "../excel/headerDetector.js";
import { normalizeCell, normalizeRollNumber, toNumber } from "../excel/cellNormalizer.js";
import { readWorkbook } from "../excel/workbookReader.js";
import { pickCell } from "../normalizers/rowMapper.js";
import type { ParseResult, ParsedResultRecord } from "../types.js";

function parseBacklog(value: unknown, grade?: string, status?: string) {
  const normalized = normalizeCell(value || status || grade).toLowerCase();
  return ["fail", "failed", "f", "ab", "absent", "backlog", "detained"].some((term) =>
    normalized.includes(term)
  );
}

function parseSubjectHeader(text: string): { code: string; name: string } {
  const clean = text.replace(/[\r\n]+/g, " ").trim();
  // Pattern 1: '( A9001 )  MAC' or '(A9001) MAC' or 'A9001 (MAC)'
  const m1 = clean.match(/^\(?\s*([A-Z0-9]{4,8})\s*\)?\s*(?:\(?\s*([^)]+)\)?)?$/i);
  if (m1) {
    const code = m1[1].toUpperCase();
    const name = (m1[2] || code).replace(/[()]/g, "").trim();
    return { code, name: name || code };
  }
  // Pattern 2: 'A9001 MAC'
  const m2 = clean.match(/^([A-Z0-9]{4,8})\s+([A-Za-z0-9\s]+)$/i);
  if (m2) {
    return { code: m2[1].toUpperCase(), name: m2[2].trim() };
  }
  return { code: "", name: clean };
}

function parseMatrixResultSheet(
  sheetRows: unknown[][],
  sheetName: string
): { records: ParsedResultRecord[]; subjects: string[] } | null {
  let rollRow = -1;
  let rollCol = -1;
  let nameCol = -1;
  let secCol = -1;
  let sgpaCol = -1;
  let cgpaCol = -1;
  let backlogCol = -1;
  let resultCol = -1;

  for (let r = 0; r < Math.min(8, sheetRows.length); r++) {
    const row = sheetRows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const v = String(row[c] || "").toLowerCase().trim();
      if ((v.includes("roll no") || v.includes("roll number") || v === "roll") && rollRow === -1) {
        rollRow = r;
        rollCol = c;
      }
      if (
        (v.includes("student name") || v.includes("name of student") || v === "name") &&
        nameCol === -1
      ) {
        nameCol = c;
      }
      if ((v === "sec" || v === "section") && secCol === -1) {
        secCol = c;
      }
      if (v === "sgpa" && sgpaCol === -1) {
        sgpaCol = c;
      }
      if ((v === "current cgpa" || v === "cgpa") && cgpaCol === -1) {
        cgpaCol = c;
      }
      if (v.includes("backlog") && backlogCol === -1) {
        backlogCol = c;
      }
      if (v === "result" && resultCol === -1) {
        resultCol = c;
      }
    }
  }

  if (rollRow === -1 || rollCol === -1) return null;

  // Search rows 0 through rollRow for subject headers (e.g. '( A9001 ) MAC')
  const subjects: { col: number; code: string; name: string }[] = [];
  for (let r = 0; r < rollRow; r++) {
    const row = sheetRows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || "").trim();
      if (!cell) continue;
      if (cell.toLowerCase().includes("info") || cell.toLowerCase().includes("result")) continue;
      const parsed = parseSubjectHeader(cell);
      if (parsed.code) {
        subjects.push({ col: c, code: parsed.code, name: parsed.name });
      }
    }
    if (subjects.length > 0) break;
  }

  if (subjects.length === 0) return null;

  const dataStart = rollRow + 1;
  const records: ParsedResultRecord[] = [];

  for (let r = dataStart; r < sheetRows.length; r++) {
    const row = sheetRows[r] || [];
    const roll = normalizeRollNumber(row[rollCol]);
    if (!roll || !/^[0-9]{2}[A-Z0-9]{4,10}/i.test(roll)) continue;

    const studentName = nameCol !== -1 ? normalizeCell(row[nameCol]) || roll : roll;
    const section = secCol !== -1 ? normalizeCell(row[secCol]) : undefined;
    const sgpa = sgpaCol !== -1 ? toNumber(row[sgpaCol]) : undefined;
    const cgpa = cgpaCol !== -1 ? toNumber(row[cgpaCol]) : undefined;
    const finalResult = resultCol !== -1 ? normalizeCell(row[resultCol]) : undefined;

    for (const sub of subjects) {
      const grade = normalizeCell(row[sub.col]) || undefined;
      const status = normalizeCell(row[sub.col + 1]) || undefined;
      const gp = toNumber(row[sub.col + 2]);

      if (grade || gp !== undefined) {
        const isBacklog = parseBacklog(undefined, grade, status);
        records.push({
          rowNumber: r + 1,
          rollNumber: roll,
          studentName,
          section,
          subjectCode: sub.code || undefined,
          subjectName: sub.name,
          grade,
          gradePoint: gp,
          sgpa,
          cgpa,
          backlog: isBacklog,
          resultStatus: finalResult
        });
      }
    }
  }

  return {
    records,
    subjects: subjects.map((s) => s.code || s.name)
  };
}

function validateFlat(record: ParsedResultRecord): string | undefined {
  if (!record.rollNumber) return "Roll number is required.";
  if (!record.studentName) return "Student name is required.";
  if (!record.subjectName && !record.subjectCode) return "Subject is required.";
  if (!record.grade && record.gradePoint === undefined) return "Grade or grade point is required.";
  return undefined;
}

export async function parseResultWorkbook(buffer: Buffer): Promise<ParseResult<ParsedResultRecord>> {
  const sheets = await readWorkbook(buffer);
  const records: ParsedResultRecord[] = [];
  const invalidRecords: { rowNumber: number; message: string }[] = [];
  const detectedSubjects = new Set<string>();
  const detectedStudents = new Set<string>();

  for (const sheet of sheets) {
    // Attempt 1: Matrix multi-subject format parser
    const matrixResult = parseMatrixResultSheet(sheet.rows, sheet.sheetName);
    if (matrixResult && matrixResult.records.length > 0) {
      for (const rec of matrixResult.records) {
        records.push(rec);
        detectedStudents.add(rec.rollNumber);
        detectedSubjects.add(rec.subjectCode || rec.subjectName);
      }
      continue;
    }

    // Attempt 2: Flat row-by-row parser
    let detection;
    try {
      detection = detectHeaderRow(sheet.rows, "results");
    } catch (error) {
      invalidRecords.push({
        rowNumber: 0,
        message: `${sheet.sheetName}: ${(error as Error).message}`
      });
      continue;
    }

    sheet.rows.slice(detection.rowIndex + 1).forEach((row, index) => {
      const rowNumber = detection.rowIndex + index + 2;
      const rollNumber = normalizeRollNumber(pickCell(row, detection.columns, "rollNumber"));
      const studentName = normalizeCell(pickCell(row, detection.columns, "studentName")) || rollNumber;
      const subjectCode = normalizeCell(pickCell(row, detection.columns, "subjectCode")).toUpperCase();
      const subjectName =
        normalizeCell(pickCell(row, detection.columns, "subjectName")) || subjectCode || sheet.sheetName;
      const grade = normalizeCell(pickCell(row, detection.columns, "grade")) || undefined;
      const resultStatus = normalizeCell(pickCell(row, detection.columns, "resultStatus")) || undefined;

      if (!rollNumber && !studentName) return;

      const record: ParsedResultRecord = {
        rowNumber,
        rollNumber,
        studentName,
        section: normalizeCell(pickCell(row, detection.columns, "section")) || undefined,
        subjectCode: subjectCode || undefined,
        subjectName,
        grade,
        gradePoint: toNumber(pickCell(row, detection.columns, "gradePoint")),
        credits: toNumber(pickCell(row, detection.columns, "credits")),
        sgpa: toNumber(pickCell(row, detection.columns, "sgpa")),
        cgpa: toNumber(pickCell(row, detection.columns, "cgpa")),
        backlog: parseBacklog(pickCell(row, detection.columns, "backlog"), grade, resultStatus),
        resultStatus
      };

      const issue = validateFlat(record);
      if (issue) {
        invalidRecords.push({ rowNumber, message: issue });
      } else {
        records.push(record);
        detectedStudents.add(record.rollNumber);
        detectedSubjects.add(record.subjectCode || record.subjectName);
      }
    });
  }

  return {
    records,
    invalidRecords,
    detectedSubjects: Array.from(detectedSubjects),
    detectedStudents: Array.from(detectedStudents),
    sheetNames: sheets.map((sheet) => sheet.sheetName)
  };
}
