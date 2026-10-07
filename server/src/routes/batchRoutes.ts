import { Router } from "express";
import { createBatch, getBatch, listBatches, updateBatch, deleteBatch } from "../controllers/batchController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const batchRoutes = Router();

batchRoutes.get("/", asyncHandler(listBatches));
batchRoutes.post("/", asyncHandler(createBatch));
batchRoutes.get("/:id", asyncHandler(getBatch));
batchRoutes.patch("/:id", asyncHandler(updateBatch));
batchRoutes.delete("/:id", asyncHandler(deleteBatch));
