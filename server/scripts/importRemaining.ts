import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectDatabase } from "../src/config/db.js";
import { Batch } from "../src/models/Batch.js";
import { User } from "../src/models/User.js";
import { Student } from "../src/models/Student.js";
import { AttendanceRecord } from "../src/models/AttendanceRecord.js";
import { ResultRecord } from "../src/models/ResultRecord.js";
import {
  processAttendanceUpload,
  processResultUpload,
  type UploadContext
} from "../src/services/importService.js";

async function main() {
  console.log("Connecting to database...");
  await connectDatabase();

  const batch = await Batch.findOne({ department: "CSM" });
  if (!batch) {
    console.error("No CSM batch found in database!");
    process.exit(1);
  }
  console.log(`Using Batch: ${batch.batchName} (${batch._id})`);

  let admin = await User.findOne({ role: "hod" });
  if (!admin) {
    admin = await User.findOne({});
  }
  if (!admin) {
    console.error("No user found in database!");
    process.exit(1);
  }
  console.log(`Using User: ${admin.name} (${admin.email}, ${admin._id})`);
  const uploadedBy = admin._id.toString();

  const filesToImport = [
    {
      filePath: "C:\\SEM EXAMS\\student management by jabbar sir\\Students data\\sem result\\RESULT 1-1.xlsx",
      type: "results" as const,
      semester: 1,
      year: "I B.Tech",
      academicYear: "2025-2026",
      section: "A"
    },
    {
      filePath: "C:\\SEM EXAMS\\student management by jabbar sir\\Students data\\ATTENDENCE\\7. CSM-I B.Tech. II _A.xlsx",
      type: "attendance" as const,
      semester: 2,
      year: "I B.Tech",
      academicYear: "2025-2026",
      section: "A"
    },
    {
      filePath: "C:\\SEM EXAMS\\student management by jabbar sir\\Students data\\sem result\\Results 1-2.xls",
      type: "results" as const,
      semester: 2,
      year: "I B.Tech",
      academicYear: "2025-2026",
      section: "A"
    }
  ];

  for (const item of filesToImport) {
    console.log(`\n==================================================`);
    console.log(`Processing: ${path.basename(item.filePath)} (${item.type.toUpperCase()}, Sem ${item.semester})`);

    if (!fs.existsSync(item.filePath)) {
      console.error(`File does not exist: ${item.filePath}`);
      continue;
    }

    const buffer = fs.readFileSync(item.filePath);
    const mockFile: Express.Multer.File = {
      buffer,
      originalname: path.basename(item.filePath),
      fieldname: "file",
      encoding: "7bit",
      mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: buffer.length,
      destination: "",
      filename: path.basename(item.filePath),
      path: item.filePath,
      stream: null as any
    };

    const context: UploadContext = {
      batchId: batch._id.toString(),
      academicYear: item.academicYear,
      year: item.year,
      semester: item.semester,
      department: "CSM",
      section: item.section,
      dataType: item.type
    };

    try {
      if (item.type === "attendance") {
        const upload = await processAttendanceUpload(mockFile, context, uploadedBy, "replace");
        console.log(`Attendance processed successfully! Processed rows: ${upload.processedRows}, status: ${upload.status}`);
      } else {
        const upload = await processResultUpload(mockFile, context, uploadedBy, "replace");
        console.log(`Results processed successfully! Processed rows: ${upload.processedRows}, status: ${upload.status}`);
      }
    } catch (err: any) {
      console.error(`Failed to process ${path.basename(item.filePath)}:`, err.message);
    }
  }

  console.log("\n==================================================");
  console.log("FINAL DATABASE STATS:");
  console.log("Total Students:", await Student.countDocuments());
  console.log("Total Attendance Records:", await AttendanceRecord.countDocuments());
  console.log("Total Result Records:", await ResultRecord.countDocuments());

  // Check sample student (e.g., 25881A6601)
  const sampleStudent = await Student.findOne({ rollNumber: "25881A6601" });
  if (sampleStudent) {
    console.log("\nSample Student Found:", sampleStudent.rollNumber, sampleStudent.name);
    const attCount = await AttendanceRecord.countDocuments({ studentId: sampleStudent._id });
    const resCount = await ResultRecord.countDocuments({ studentId: sampleStudent._id });
    console.log(`  Attendance count: ${attCount}, Result count: ${resCount}`);
  }

  await mongoose.disconnect();
  console.log("Done!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
