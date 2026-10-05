import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB() {
  const isProd = process.env.NODE_ENV === "production" || process.env.RENDER;
  const primaryUri = env.mongoUri;
  const fallbackLocalUri = "mongodb://127.0.0.1:27017/syncmeet";

  while (mongoose.connection.readyState !== 1) {
    try {
      console.log("Connecting to MongoDB...");
      await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 5000 });
      console.log("MongoDB connected successfully");
      break;
    } catch (err) {
      console.error("Primary MongoDB connection error:", err.message);
      if (!isProd) {
        try {
          console.log("Attempting connection to local MongoDB...");
          await mongoose.connect(fallbackLocalUri, { serverSelectionTimeoutMS: 3000 });
          console.log("MongoDB connected successfully (local fallback)");
          break;
        } catch (localErr) {
          console.error("Local MongoDB fallback error:", localErr.message);
        }
      }
      console.log("Retrying MongoDB connection in 5 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}
