import { Router } from "express";
import {
  listAttendance,
  listResults,
  deleteAttendanceRecord,
  deleteResultRecord
} from "../controllers/recordController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const attendanceRoutes = Router();
export const resultRoutes = Router();

attendanceRoutes.get("/", asyncHandler(listAttendance));
attendanceRoutes.delete("/:id", asyncHandler(deleteAttendanceRecord));

resultRoutes.get("/", asyncHandler(listResults));
resultRoutes.delete("/:id", asyncHandler(deleteResultRecord));
