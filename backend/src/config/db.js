import mongoose from "mongoose";
import dns from "node:dns";
import { env } from "./env.js";

// Force IPv4 resolution first for Node 18+ DNS compatibility with Atlas
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

// Disable command buffering so queries fail fast with clear errors instead of timing out after 10s
mongoose.set("bufferCommands", false);

export async function connectDB() {
  const isProd = process.env.NODE_ENV === "production" || process.env.RENDER;
  const primaryUri = env.mongoUri;
  const fallbackLocalUri = "mongodb://127.0.0.1:27017/syncmeet";

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 5000 });
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    if (!isProd) {
      try {
        console.log("Attempting fallback connection to local MongoDB...");
        await mongoose.connect(fallbackLocalUri, { serverSelectionTimeoutMS: 3000 });
        console.log("MongoDB connected successfully (local fallback)");
        return;
      } catch (localErr) {
        console.error("Local MongoDB fallback error:", localErr.message);
      }
    }
    throw err;
  }
}
