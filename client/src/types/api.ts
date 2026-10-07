export interface Batch {
  _id: string;
  batchName: string;
  startYear: number;
  endYear: number;
  department: string;
  program: string;
  duration: number;
  status: "active" | "archived";
}

export interface Paginated<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
  };
}

export interface Student {
  _id: string;
  rollNumber: string;
  name: string;
  batchId: Batch | string;
  department: string;
  program: string;
  admissionYear?: number;
  graduationYear?: number;
  currentYear: string;
  currentSection?: string;
  status: string;
}

export interface AttendanceRecord {
  _id: string;
  rollNumber: string;
  studentId: { _id?: string; name: string } | string;
  batchId: Batch | string;
  academicYear: string;
  year: string;
  semester: number;
  department: string;
  section: string;
  subjectCode?: string;
  subjectName: string;
  classesConducted: number;
  classesAttended: number;
  attendancePercentage?: number;
}

export interface ResultRecord {
  _id: string;
  rollNumber: string;
  studentId: { _id?: string; name: string } | string;
  batchId: Batch | string;
  academicYear: string;
  year: string;
  semester: number;
  department: string;
  section?: string;
  subjectCode?: string;
  subjectName: string;
  grade?: string;
  gradePoint?: number;
  credits?: number;
  sgpa?: number;
  cgpa?: number;
  backlog?: boolean;
  resultStatus?: string;
}

export interface UploadRecord {
  _id: string;
  fileName: string;
  dataType: "attendance" | "results";
  batchId: Batch | string;
  academicYear: string;
  year: string;
  semester: number;
  department: string;
  section?: string;
  status: string;
  totalRows: number;
  processedRows: number;
  failedRows: number;
  duplicateRows: number;
  errorMessages: string[];
  uploadedAt: string;
  completedAt?: string;
}

export interface UploadPreview {
  fileName: string;
  studentsDetected: number;
  subjectsDetected: number;
  recordsDetected: number;
  validRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  errors: { rowNumber: number; message: string }[];
  records: Record<string, unknown>[];
}

// Phase 2 types
export interface SubjectMapping {
  subjectCode: string;
  subjectName: string;
  classesConducted?: number;
  classesAttended?: number;
  attendancePercentage?: number;
  hasAttendance: boolean;
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
  student: Student & {
    batchId: Batch;
    admissionYear: number;
    graduationYear: number;
  };
  semesters: SemesterSummary[];
  overallCgpa?: number;
  overallAttendancePercentage?: number;
  totalClassesConducted: number;
  totalClassesAttended: number;
}

export interface PerformanceTrendPoint {
  semester: number;
  academicYear: string;
  sgpa?: number;
  cgpa?: number;
  attendancePercentage?: number;
}

export interface BatchStudentsResponse extends Paginated<Student> {
  batchInfo: {
    batch: Batch;
    totalStudents: number;
    sections: string[];
    availableSemesters: number[];
    studentsWithAttendance: number;
    studentsWithResults: number;
  };
}

export interface SectionStudentRow extends Student {
  attendance?: {
    classesConducted: number;
    classesAttended: number;
    percentage?: number;
  };
  performance?: {
    sgpa?: number;
    cgpa?: number;
  };
}

export interface FilterOptions {
  batches: Batch[];
  academicYears: string[];
  semesters: number[];
  sections: string[];
  departments: string[];
  subjects: { subjectCode?: string; subjectName: string }[];
}

