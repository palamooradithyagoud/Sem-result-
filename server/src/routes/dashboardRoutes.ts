import { Router } from "express";
import { getDashboardSummary } from "../controllers/dashboardController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const dashboardRoutes = Router();

dashboardRoutes.get("/summary", asyncHandler(getDashboardSummary));
