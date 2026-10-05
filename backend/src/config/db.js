import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB() {
  const isProd = process.env.NODE_ENV === "production" || process.env.RENDER;
  const primaryUri = env.mongoUri;
  const fallbackLocalUri = "mongodb://127.0.0.1:27017/syncmeet";

  try {
    await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 5000 });
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    if (!isProd) {
      try {
        console.log("Attempting connection to local MongoDB...");
        await mongoose.connect(fallbackLocalUri, { serverSelectionTimeoutMS: 3000 });
        console.log("MongoDB connected successfully (local fallback)");
        return;
      } catch (localErr) {
        console.error("Local MongoDB fallback error:", localErr.message);
      }
    }
    console.log("Retrying MongoDB connection in 10 seconds...");
    setTimeout(connectDB, 10000);
  }
}
