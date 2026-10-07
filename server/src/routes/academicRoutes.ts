import { Router } from "express";
import { getBatchStudents, getSectionView } from "../controllers/studentProfileController.js";
import {
  getFilterOptions,
  getAcademicSemesters,
  getAcademicSubjects
} from "../controllers/academicController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const batchDetailRoutes = Router();
export const sectionRoutes = Router();
export const academicRoutes = Router();

// Batch student management
batchDetailRoutes.get("/:id/students", asyncHandler(getBatchStudents));

// Section level views
sectionRoutes.get("/", asyncHandler(getSectionView));

// Academic meta / filters
academicRoutes.get("/filter-options", asyncHandler(getFilterOptions));
academicRoutes.get("/semesters", asyncHandler(getAcademicSemesters));
academicRoutes.get("/subjects", asyncHandler(getAcademicSubjects));
