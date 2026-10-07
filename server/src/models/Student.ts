import mongoose, { Schema, Types } from "mongoose";

export interface IStudent extends mongoose.Document {
  rollNumber: string;
  name: string;
  batchId: Types.ObjectId;
  department: string;
  program: string;
  admissionYear: number;
  graduationYear: number;
  currentYear: string;
  currentSection?: string;
  status: "active" | "inactive" | "graduated";
}

const studentSchema = new Schema<IStudent>(
  {
    rollNumber: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    department: { type: String, required: true, trim: true },
    program: { type: String, required: true, trim: true },
    admissionYear: { type: Number, required: true },
    graduationYear: { type: Number, required: true },
    currentYear: { type: String, required: true, trim: true },
    currentSection: { type: String, trim: true },
    status: { type: String, enum: ["active", "inactive", "graduated"], default: "active" }
  },
  { timestamps: true }
);

studentSchema.index({ rollNumber: 1, batchId: 1 }, { unique: true });
studentSchema.index({ rollNumber: 1 });
studentSchema.index({ department: 1 });
studentSchema.index({ batchId: 1, currentYear: 1, currentSection: 1 });

export const Student = mongoose.model<IStudent>("Student", studentSchema);
