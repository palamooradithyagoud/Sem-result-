import type { Request, Response } from "express";
import { loginSchema } from "../validators/auth.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/apiError.js";
import { signAuthToken } from "../middleware/auth.js";

export async function login(req: Request, res: Response) {
  const body = loginSchema.parse(req.body);
  const user = await User.findOne({ email: body.email.toLowerCase(), isActive: true });

  if (!user || !(await user.comparePassword(body.password))) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const token = signAuthToken({ sub: user.id, role: user.role });
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60 * 1000
  });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie("token");
  res.json({ message: "Logged out." });
}
