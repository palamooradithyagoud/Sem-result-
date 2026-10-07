import mongoose, { Schema, Types } from "mongoose";

export interface IAttendanceRecord extends mongoose.Document {
  studentId: Types.ObjectId;
  rollNumber: string;
  batchId: Types.ObjectId;
  academicYear: string;
  year: string;
  semester: number;
  department: string;
  section: string;
  subjectId?: Types.ObjectId;
  subjectCode?: string;
  subjectName: string;
  classesConducted: number;
  classesAttended: number;
  attendancePercentage?: number;
  sourceUploadId: Types.ObjectId;
}

const attendanceRecordSchema = new Schema<IAttendanceRecord>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    rollNumber: { type: String, required: true, trim: true, uppercase: true },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    academicYear: { type: String, required: true, trim: true },
    year: { type: String, required: true, trim: true },
    semester: { type: Number, required: true, min: 1 },
    department: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject" },
    subjectCode: { type: String, trim: true, uppercase: true },
    subjectName: { type: String, required: true, trim: true },
    classesConducted: { type: Number, required: true, min: 0 },
    classesAttended: { type: Number, required: true, min: 0 },
    attendancePercentage: { type: Number, min: 0, max: 100 },
    sourceUploadId: { type: Schema.Types.ObjectId, ref: "Upload", required: true }
  },
  { timestamps: true }
);

attendanceRecordSchema.index(
  { batchId: 1, academicYear: 1, semester: 1, rollNumber: 1, subjectCode: 1, subjectName: 1 },
  { unique: true }
);
attendanceRecordSchema.index({ studentId: 1, semester: 1 });
attendanceRecordSchema.index({ rollNumber: 1 });
attendanceRecordSchema.index({ academicYear: 1, semester: 1 });
attendanceRecordSchema.index({ department: 1, academicYear: 1 });
attendanceRecordSchema.index({ subjectCode: 1 });

export const AttendanceRecord = mongoose.model<IAttendanceRecord>(
  "AttendanceRecord",
  attendanceRecordSchema
);
