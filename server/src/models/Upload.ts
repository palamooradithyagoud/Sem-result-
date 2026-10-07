import mongoose, { Schema, Types } from "mongoose";

export type UploadStatus = "uploaded" | "processing" | "processed" | "partially_processed" | "failed";
export type UploadDataType = "attendance" | "results";

export interface IUpload extends mongoose.Document {
  fileName: string;
  dataType: UploadDataType;
  batchId: Types.ObjectId;
  academicYear: string;
  year: string;
  semester: number;
  department: string;
  section?: string;
  uploadedBy: Types.ObjectId;
  status: UploadStatus;
  totalRows: number;
  processedRows: number;
  failedRows: number;
  duplicateRows: number;
  errorMessages: string[];
  uploadedAt: Date;
  completedAt?: Date;
}

const uploadSchema = new Schema<IUpload>(
  {
    fileName: { type: String, required: true, trim: true },
    dataType: { type: String, enum: ["attendance", "results"], required: true },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    academicYear: { type: String, required: true, trim: true },
    year: { type: String, required: true, trim: true },
    semester: { type: Number, required: true, min: 1 },
    department: { type: String, required: true, trim: true },
    section: { type: String, trim: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["uploaded", "processing", "processed", "partially_processed", "failed"],
      default: "uploaded"
    },
    totalRows: { type: Number, default: 0 },
    processedRows: { type: Number, default: 0 },
    failedRows: { type: Number, default: 0 },
    duplicateRows: { type: Number, default: 0 },
    errorMessages: [{ type: String }],
    uploadedAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

uploadSchema.index({ uploadedAt: -1 });

export const Upload = mongoose.model<IUpload>("Upload", uploadSchema);
