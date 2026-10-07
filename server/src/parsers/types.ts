export interface ParsedRecordIssue {
  rowNumber: number;
  message: string;
}

export interface ParsedAttendanceRecord {
  rowNumber: number;
  rollNumber: string;
  studentName: string;
  section?: string;
  subjectCode?: string;
  subjectName: string;
  classesConducted: number;
  classesAttended: number;
  attendancePercentage?: number;
}

export interface ParsedResultRecord {
  rowNumber: number;
  rollNumber: string;
  studentName: string;
  section?: string;
  subjectCode?: string;
  subjectName: string;
  grade?: string;
  gradePoint?: number;
  credits?: number;
  sgpa?: number;
  cgpa?: number;
  backlog: boolean;
  resultStatus?: string;
}

export interface ParseResult<T> {
  records: T[];
  invalidRecords: ParsedRecordIssue[];
  detectedSubjects: string[];
  detectedStudents: string[];
  sheetNames: string[];
}
