import { env } from "../config/env.js";
import { User, hashPassword } from "../models/User.js";

export async function bootstrapAdmin() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    return;
  }

  const existing = await User.findOne({ email: env.ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    return;
  }

  await User.create({
    name: "HOD Administrator",
    email: env.ADMIN_EMAIL.toLowerCase(),
    passwordHash: await hashPassword(env.ADMIN_PASSWORD),
    role: "hod"
  });
}
