import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { User, hashPassword } from "../models/User.js";

interface TokenPayload {
  sub: string;
  role: "hod";
}

export function signAuthToken(payload: TokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "8h" });
}

let defaultAdminId: string | null = null;

async function getOrCreateAdminId(): Promise<string> {
  if (defaultAdminId) return defaultAdminId;
  const existing = await User.findOne();
  if (existing) {
    defaultAdminId = existing._id.toString();
    return defaultAdminId;
  }
  const created = await User.create({
    name: "HOD Administrator",
    email: (env.ADMIN_EMAIL && env.ADMIN_EMAIL.length > 0 ? env.ADMIN_EMAIL : "admin@dept.edu").toLowerCase(),
    passwordHash: await hashPassword(env.ADMIN_PASSWORD || "Admin@1234"),
    role: "hod"
  });
  defaultAdminId = created._id.toString();
  return defaultAdminId;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const bearerToken = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const cookieToken = req.cookies?.token;
  const token = bearerToken || cookieToken;

  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
      req.user = { id: decoded.sub, role: decoded.role };
      return next();
    } catch {
      // Fall through to default admin
    }
  }

  try {
    const adminId = await getOrCreateAdminId();
    req.user = { id: adminId, role: "hod" };
    return next();
  } catch (err) {
    return next(err);
  }
}
