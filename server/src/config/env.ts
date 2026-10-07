import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "server/.env") });

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z
    .string()
    .min(24, "JWT_SECRET must be at least 24 characters")
    .default("samas-super-secret-jwt-key-2024-change-in-production"),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  ADMIN_EMAIL: z.string().email().optional().or(z.literal("")),
  ADMIN_PASSWORD: z.string().min(8).optional().or(z.literal(""))
});

export const env = envSchema.parse(process.env);
