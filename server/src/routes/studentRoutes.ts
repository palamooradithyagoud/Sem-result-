import { Router } from "express";
import { getStudent, listStudents, deleteStudent } from "../controllers/studentController.js";
import {
  getStudentProfile,
  getStudentPerformanceTrend,
  getStudentSemesters,
  getStudentAttendance,
  getStudentResults,
  getStudentSubjects
} from "../controllers/studentProfileController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const studentRoutes = Router();

studentRoutes.get("/", asyncHandler(listStudents));
studentRoutes.get("/:id", asyncHandler(getStudent));
studentRoutes.delete("/:id", asyncHandler(deleteStudent));
studentRoutes.get("/:id/profile", asyncHandler(getStudentProfile));
studentRoutes.get("/:id/performance", asyncHandler(getStudentPerformanceTrend));
studentRoutes.get("/:id/semesters", asyncHandler(getStudentSemesters));
studentRoutes.get("/:id/attendance", asyncHandler(getStudentAttendance));
studentRoutes.get("/:id/results", asyncHandler(getStudentResults));
studentRoutes.get("/:id/subjects", asyncHandler(getStudentSubjects));
