import { normalizeHeader } from "./cellNormalizer.js";

export type CanonicalColumn =
  | "rollNumber"
  | "studentName"
  | "section"
  | "subjectCode"
  | "subjectName"
  | "classesConducted"
  | "classesAttended"
  | "attendancePercentage"
  | "grade"
  | "gradePoint"
  | "credits"
  | "sgpa"
  | "cgpa"
  | "backlog"
  | "resultStatus";

const aliases: Record<CanonicalColumn, string[]> = {
  rollNumber: ["roll no", "roll number", "rollno", "roll", "reg no", "registration number", "hall ticket"],
  studentName: ["student name", "name of student", "name", "candidate name"],
  section: ["section", "sec"],
  subjectCode: ["subject code", "sub code", "course code", "code"],
  subjectName: ["subject", "subject name", "course", "course name", "paper"],
  classesConducted: ["classes conducted", "conducted", "total classes", "held", "total periods"],
  classesAttended: ["classes attended", "attended", "present", "attended classes"],
  attendancePercentage: ["attendance percentage", "overall percentage", "percentage", "attendance"],
  grade: ["grade", "letter grade"],
  gradePoint: ["grade point", "points", "gp"],
  credits: ["credits", "credit"],
  sgpa: ["sgpa"],
  cgpa: ["cgpa"],
  backlog: ["backlog", "backlogs", "arrears"],
  resultStatus: ["result status", "status", "result"]
};

function matchesAlias(header: string, canonical: CanonicalColumn) {
  return aliases[canonical].some((alias) => header === alias || header.includes(alias));
}

export interface HeaderDetection {
  rowIndex: number;
  columns: Partial<Record<CanonicalColumn, number>>;
  score: number;
}

export function detectHeaderRow(rows: unknown[][], mode: "attendance" | "results"): HeaderDetection {
  const required: CanonicalColumn[] =
    mode === "attendance"
      ? ["rollNumber", "studentName", "classesConducted", "classesAttended"]
      : ["rollNumber", "studentName", "grade"];

  const candidates = rows.slice(0, 40).map((row, rowIndex) => {
    const columns: Partial<Record<CanonicalColumn, number>> = {};
    row.forEach((cell, columnIndex) => {
      const header = normalizeHeader(cell);
      if (!header) return;

      (Object.keys(aliases) as CanonicalColumn[]).forEach((canonical) => {
        if (columns[canonical] === undefined && matchesAlias(header, canonical)) {
          columns[canonical] = columnIndex;
        }
      });
    });

    const matchedCount = Object.keys(columns).length;
    const requiredCount = required.filter((column) => columns[column] !== undefined).length;
    return {
      rowIndex,
      columns,
      score: requiredCount * 10 + matchedCount
    };
  });

  const best = candidates.sort((a, b) => b.score - a.score)[0];
  if (!best || required.some((column) => best.columns[column] === undefined)) {
    const missing = required.filter((column) => best?.columns[column] === undefined);
    throw new Error(`Unable to identify required columns: ${missing.join(", ")}.`);
  }

  return best;
}
