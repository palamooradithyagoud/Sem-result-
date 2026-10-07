import mongoose, { Schema, Types } from "mongoose";

export interface IResultRecord extends mongoose.Document {
  studentId: Types.ObjectId;
  rollNumber: string;
  batchId: Types.ObjectId;
  academicYear: string;
  year: string;
  semester: number;
  department: string;
  section?: string;
  subjectId?: Types.ObjectId;
  subjectCode?: string;
  subjectName: string;
  grade?: string;
  gradePoint?: number;
  credits?: number;
  sgpa?: number;
  cgpa?: number;
  backlog: boolean;
  resultStatus?: string;
  sourceUploadId: Types.ObjectId;
}

const resultRecordSchema = new Schema<IResultRecord>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    rollNumber: { type: String, required: true, trim: true, uppercase: true },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    academicYear: { type: String, required: true, trim: true },
    year: { type: String, required: true, trim: true },
    semester: { type: Number, required: true, min: 1 },
    department: { type: String, required: true, trim: true },
    section: { type: String, trim: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject" },
    subjectCode: { type: String, trim: true, uppercase: true },
    subjectName: { type: String, required: true, trim: true },
    grade: { type: String, trim: true },
    gradePoint: { type: Number, min: 0 },
    credits: { type: Number, min: 0 },
    sgpa: { type: Number, min: 0 },
    cgpa: { type: Number, min: 0 },
    backlog: { type: Boolean, default: false },
    resultStatus: { type: String, trim: true },
    sourceUploadId: { type: Schema.Types.ObjectId, ref: "Upload", required: true }
  },
  { timestamps: true }
);

resultRecordSchema.index(
  { batchId: 1, academicYear: 1, semester: 1, rollNumber: 1, subjectCode: 1, subjectName: 1 },
  { unique: true }
);
resultRecordSchema.index({ studentId: 1, semester: 1 });
resultRecordSchema.index({ rollNumber: 1 });
resultRecordSchema.index({ academicYear: 1, semester: 1 });
resultRecordSchema.index({ department: 1, academicYear: 1 });
resultRecordSchema.index({ subjectCode: 1 });

export const ResultRecord = mongoose.model<IResultRecord>("ResultRecord", resultRecordSchema);
