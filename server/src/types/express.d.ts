import type { Types } from "mongoose";

declare global {
  namespace Express {
    interface User {
      id: string;
      role: "hod";
    }

    interface Request {
      user?: User;
    }
  }
}

export type ObjectIdLike = string | Types.ObjectId;
