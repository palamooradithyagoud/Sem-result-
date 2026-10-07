import mongoose, { Schema } from "mongoose";

export interface ISubject extends mongoose.Document {
  subjectCode?: string;
  subjectName: string;
  department: string;
  program?: string;
  academicYear: string;
  semester: number;
  year: string;
  credits?: number;
}

const subjectSchema = new Schema<ISubject>(
  {
    subjectCode: { type: String, trim: true, uppercase: true },
    subjectName: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    program: { type: String, trim: true },
    academicYear: { type: String, required: true, trim: true },
    semester: { type: Number, required: true, min: 1 },
    year: { type: String, required: true, trim: true },
    credits: { type: Number, min: 0 }
  },
  { timestamps: true }
);

subjectSchema.index(
  { subjectCode: 1, subjectName: 1, department: 1, academicYear: 1, semester: 1 },
  { unique: true }
);

export const Subject = mongoose.model<ISubject>("Subject", subjectSchema);
