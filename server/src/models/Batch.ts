import mongoose, { Schema } from "mongoose";

export interface IBatch extends mongoose.Document {
  batchName: string;
  startYear: number;
  endYear: number;
  department: string;
  program: string;
  duration: number;
  status: "active" | "archived";
}

const batchSchema = new Schema<IBatch>(
  {
    batchName: { type: String, required: true, trim: true },
    startYear: { type: Number, required: true },
    endYear: { type: Number, required: true },
    department: { type: String, required: true, trim: true },
    program: { type: String, required: true, trim: true },
    duration: { type: Number, required: true },
    status: { type: String, enum: ["active", "archived"], default: "active" }
  },
  { timestamps: true }
);

batchSchema.index({ batchName: 1, department: 1, program: 1 }, { unique: true });

export const Batch = mongoose.model<IBatch>("Batch", batchSchema);
