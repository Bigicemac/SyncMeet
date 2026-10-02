import jwt from "jsonwebtoken";
import User from "../database/models/User.js";
import { env } from "../config/env.js";

const signToken = (userId) =>
  jwt.sign({ id: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email });

export async function register(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "name, email and password are required" });
  }
  if (await User.findOne({ email })) {
    return res.status(409).json({ message: "Email already registered" });
  }
  const user = await User.create({ name, email, password });
  res.status(201).json({ token: signToken(user._id), user: publicUser(user) });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  res.json({ token: signToken(user._id), user: publicUser(user) });
}

export function me(req, res) {
  res.json({ user: publicUser(req.user) });
}
