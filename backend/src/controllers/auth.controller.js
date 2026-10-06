import jwt from "jsonwebtoken";
import User from "../database/models/User.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const signToken = (userId) =>
  jwt.sign({ id: userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  personalMeetingId: u.personalMeetingId || "9517453380",
});

async function getUniquePersonalMeetingId() {
  let pmid;
  let exists = true;
  while (exists) {
    pmid = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const existing = await User.findOne({ personalMeetingId: pmid });
    if (!existing) exists = false;
  }
  return pmid;
}

export async function register(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    throw new ApiError(400, "Name, email and password are required");
  }
  const cleanEmail = String(email).trim().toLowerCase();
  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    throw new ApiError(409, "Email already registered");
  }
  const personalMeetingId = await getUniquePersonalMeetingId();
  const user = await User.create({
    name: name.trim(),
    email: cleanEmail,
    password,
    personalMeetingId,
  });
  res.status(201).json({
    success: true,
    token: signToken(user._id),
    user: publicUser(user),
  });
}

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }
  const cleanEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: cleanEmail }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!user.personalMeetingId) {
    user.personalMeetingId = await getUniquePersonalMeetingId();
    await user.save();
  }

  res.status(200).json({
    success: true,
    token: signToken(user._id),
    user: publicUser(user),
  });
}

export function me(req, res) {
  res.status(200).json({
    success: true,
    user: publicUser(req.user),
  });
}
