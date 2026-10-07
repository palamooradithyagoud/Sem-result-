import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends mongoose.Document {
  name: string;
  email: string;
  passwordHash: string;
  role: "hod";
  isActive: boolean;
  comparePassword(password: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["hod"], default: "hod" },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function comparePassword(password: string) {
  return bcrypt.compare(password, this.passwordHash);
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export const User = mongoose.model<IUser>("User", userSchema);
