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

import { bootstrapAdmin } from "./services/bootstrapAdmin.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN || true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

let bootstrapped = false;
// Ensure DB is connected and admin initialized for serverless invocations
app.use(async (_req, _res, next) => {
  try {
    await connectDatabase();
    if (!bootstrapped) {
      await bootstrapAdmin();
      bootstrapped = true;
    }
    next();
  } catch (err) {
    next(err);
  }
});

const api = express.Router();

api.get("/health", (_req, res) => res.json({ status: "ok" }));
api.use("/auth", authRoutes);

api.use(requireAuth);
api.use("/dashboard", dashboardRoutes);
api.use("/batches", batchRoutes);
api.use("/batches", batchDetailRoutes);
api.use("/academic", academicRoutes);
api.use("/students", studentRoutes);
api.use("/attendance", attendanceRoutes);
api.use("/results", resultRoutes);
api.use("/uploads", uploadRoutes);
api.use("/sections", sectionRoutes);

// Support both /api/* and direct path invocation from Vercel rewrites
app.use("/api", api);
app.use(api);

app.use(errorHandler);

export default app;
