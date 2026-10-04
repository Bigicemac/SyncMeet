import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { env } from "../config/env.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Not authenticated" });

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.id);
    if (!user)
      return res.status(401).json({ message: "User no longer exists" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export const verifyJWT = requireAuth;
export const authenticate = requireAuth;
