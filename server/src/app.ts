import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/db.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRoutes } from "./routes/authRoutes.js";
import { attendanceRoutes, resultRoutes } from "./routes/recordRoutes.js";
import { batchRoutes } from "./routes/batchRoutes.js";
import { dashboardRoutes } from "./routes/dashboardRoutes.js";
import { studentRoutes } from "./routes/studentRoutes.js";
import { uploadRoutes } from "./routes/uploadRoutes.js";
import { batchDetailRoutes, sectionRoutes, academicRoutes } from "./routes/academicRoutes.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN || true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

// Ensure DB is connected for serverless invocations
app.use(async (_req, _res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (err) {
    next(err);
  }
});

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);

app.use(requireAuth);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/batches", batchDetailRoutes);
app.use("/api/academic", academicRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/sections", sectionRoutes);

app.use(errorHandler);

export default app;
