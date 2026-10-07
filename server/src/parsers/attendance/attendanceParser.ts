import { detectHeaderRow } from "../excel/headerDetector.js";
import { normalizeCell, normalizeRollNumber, toNumber } from "../excel/cellNormalizer.js";
import { readWorkbook } from "../excel/workbookReader.js";
import { pickCell } from "../normalizers/rowMapper.js";
import type { ParseResult, ParsedAttendanceRecord } from "../types.js";

function parseSubjectHeader(text: string): { code: string; name: string } {
  const clean = text.replace(/[\r\n]+/g, " ").trim();
  // Pattern 1: 'A9001 (MAC)' or '( A9001 ) MAC' or 'A9008 (EP Lab)'
  const m1 = clean.match(/^\(?\s*([A-Z0-9]{4,8})\s*\)?\s*(?:\(?\s*([^)]+)\)?)?$/i);
  if (m1) {
    const code = m1[1].toUpperCase();
    const name = (m1[2] || code).replace(/[()]/g, "").trim();
    return { code, name: name || code };
  }
  // Pattern 2: 'A9002 ODECV' or 'A9002\nODECV'
  const m2 = clean.match(/^([A-Z0-9]{4,8})\s+([A-Za-z0-9\s]+)$/i);
  if (m2) {
    return { code: m2[1].toUpperCase(), name: m2[2].trim() };
  }
  return { code: "", name: clean };
}

function parseMatrixSheet(
  sheetRows: unknown[][],
  sheetName: string
): { records: ParsedAttendanceRecord[]; subjects: string[] } | null {
  let rollRow = -1;
  let rollCol = -1;
  let nameCol = -1;
  let secCol = -1;

  for (let r = 0; r < Math.min(10, sheetRows.length); r++) {
    const row = sheetRows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const v = String(row[c] || "").toLowerCase().trim();
      if ((v.includes("roll no") || v.includes("roll number") || v === "roll") && rollRow === -1) {
        rollRow = r;
        rollCol = c;
      }
      if (
        (v.includes("name of the student") || v.includes("name of student") || v.includes("student name") || v === "name") &&
        nameCol === -1
      ) {
        nameCol = c;
      }
      if ((v === "sec" || v === "section") && secCol === -1) {
        secCol = c;
      }
    }
    if (rollRow !== -1) break;
  }

  if (rollRow === -1 || rollCol === -1) return null;

  // Detect section from sheet name or top metadata rows
  let sheetSec: string | undefined;
  const topText = (sheetName + " " + sheetRows.slice(0, 4).flat().join(" ")).trim();
  const mSec = topText.match(/section\s*[-:]?\s*([A-Za-z0-9]+)|CSM\s*[-_]?\s*([A-Za-z0-9]+)/i);
  if (mSec) sheetSec = (mSec[1] || mSec[2]).toUpperCase();

  // Find subject columns on the header row
  const subjects: { col: number; code: string; name: string }[] = [];
  const hRow = sheetRows[rollRow] || [];
  const startCol = Math.max(rollCol, nameCol, secCol) + 1;

  for (let c = startCol; c < hRow.length; c++) {
    const cell = String(hRow[c] || "").trim();
    if (!cell) continue;
    if (cell.toLowerCase().includes("total") || cell.toLowerCase() === "tc") break;
    const { code, name } = parseSubjectHeader(cell);
    subjects.push({ col: c, code, name });
  }

  if (subjects.length === 0) return null;

  // Look for subheader row containing 'C' (Conducted) and 'A' (Attended)
  let subRow = -1;
  for (let r = rollRow + 1; r < Math.min(rollRow + 5, sheetRows.length); r++) {
    const row = sheetRows[r] || [];
    if (row.some((cell) => String(cell).trim().toUpperCase() === "C")) {
      subRow = r;
      break;
    }
  }

  const dataStart = subRow !== -1 ? subRow + 1 : rollRow + 1;
  const records: ParsedAttendanceRecord[] = [];

  for (let r = dataStart; r < sheetRows.length; r++) {
    const row = sheetRows[r] || [];
    const roll = normalizeRollNumber(row[rollCol]);
    if (!roll || !/^[0-9]{2}[A-Z0-9]{4,10}/i.test(roll)) continue;

    const studentName = nameCol !== -1 ? normalizeCell(row[nameCol]) || roll : roll;
    const section = secCol !== -1 ? normalizeCell(row[secCol]) || sheetSec : sheetSec;

    for (const sub of subjects) {
      const conducted = toNumber(row[sub.col]);
      const attended = toNumber(row[sub.col + 1]);

      if (conducted !== undefined && attended !== undefined && conducted >= 0 && attended >= 0) {
        const pct = conducted > 0 ? Number(((attended / conducted) * 100).toFixed(2)) : 0;
        records.push({
          rowNumber: r + 1,
          rollNumber: roll,
          studentName,
          section,
          subjectCode: sub.code || undefined,
          subjectName: sub.name,
          classesConducted: conducted,
          classesAttended: attended,
          attendancePercentage: pct
        });
      }
    }
  }

  return {
    records,
    subjects: subjects.map((s) => s.code || s.name)
  };
}

function validateFlat(record: ParsedAttendanceRecord): string | undefined {
  if (!record.rollNumber) return "Roll number is required.";
  if (!record.studentName) return "Student name is required.";
  if (!record.subjectName && !record.subjectCode) return "Subject is required.";
  if (record.classesConducted < 0) return "Classes conducted cannot be negative.";
  if (record.classesAttended < 0) return "Classes attended cannot be negative.";
  if (record.classesAttended > record.classesConducted) {
    return "Classes attended cannot exceed classes conducted.";
  }
  if (
    record.attendancePercentage !== undefined &&
    (record.attendancePercentage < 0 || record.attendancePercentage > 100)
  ) {
    return "Attendance percentage must be between 0 and 100.";
  }
  return undefined;
}

export async function parseAttendanceWorkbook(buffer: Buffer): Promise<ParseResult<ParsedAttendanceRecord>> {
  const sheets = await readWorkbook(buffer);
  const records: ParsedAttendanceRecord[] = [];
  const invalidRecords: { rowNumber: number; message: string }[] = [];
  const detectedSubjects = new Set<string>();
  const detectedStudents = new Set<string>();

  for (const sheet of sheets) {
    // Attempt 1: Matrix format parser
    const matrixResult = parseMatrixSheet(sheet.rows, sheet.sheetName);
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
      detection = detectHeaderRow(sheet.rows, "attendance");
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
      const classesConducted = toNumber(pickCell(row, detection.columns, "classesConducted"));
      const classesAttended = toNumber(pickCell(row, detection.columns, "classesAttended"));
      const sourcePercentage = toNumber(pickCell(row, detection.columns, "attendancePercentage"));

      if (!rollNumber && !studentName) return;

      if (classesConducted === undefined || classesAttended === undefined) {
        invalidRecords.push({ rowNumber, message: "Classes conducted and attended are required." });
        return;
      }

      const calculatedPercentage =
        classesConducted > 0 ? Number(((classesAttended / classesConducted) * 100).toFixed(2)) : undefined;

      const record: ParsedAttendanceRecord = {
        rowNumber,
        rollNumber,
        studentName,
        section: normalizeCell(pickCell(row, detection.columns, "section")) || undefined,
        subjectCode: subjectCode || undefined,
        subjectName,
        classesConducted,
        classesAttended,
        attendancePercentage: sourcePercentage ?? calculatedPercentage
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
