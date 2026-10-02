// // import "dotenv/config";
// // import express from "express";
// import mongoose from "mongoose";

// const app = express();
// app.use(express.json());

// const mongoUri = process.env.MONGODB_URI;
// const hasPlaceholderUri =
//   !mongoUri ||
//   mongoUri.includes("<username>") ||
//   mongoUri.includes("<password>") ||
//   mongoUri.includes("YOUR_USERNAME") ||
//   mongoUri.includes("YOUR_PASSWORD") ||
//   mongoUri.includes("<") ||
//   mongoUri.includes(">") ||
//   mongoUri.trim() === "";

// if (hasPlaceholderUri) {
//   console.error(
//     "MongoDB is not configured. Update .env with your real MONGODB_URI without angle brackets. Example: mongodb+srv://<username>:<password>@cluster0.xxxxxx.mongodb.net/?appName=Cluster0"
//   );
//   process.exit(1);
// }

// app.get("/api/health", (req, res) => res.json({ ok: true }));


// const asyc = async () => {
// try {
//   await mongoose.connect(mongoUri);
//   console.log("MongoDB connected");
//   app.listen(process.env.PORT || 3000, () =>
//     console.log("Server running on http://localhost:" + (process.env.PORT || 3000))
//   );
// } catch (error) {
//   console.error("Database connection failed:", error.message);
//   console.error(
//     "If you are using MongoDB Atlas, make sure your current IP is whitelisted in Atlas > Network Access."
//   );
//   process.exit(1);
// }
// }



// import dotenv from "dotenv";
// import connectDB from "./db/index.js";
// import { app } from "./app.js";

// dotenv.config({ path: "./.env" });

// connectDB()
//   .then(() => {
//     app.listen(process.env.PORT || 8000, () => {
//       console.log(`Server running on port ${process.env.PORT || 8000}`);
//     });
//   })
//   .catch((error) => {
//     console.error("MongoDB connection failed:", error);
//   });

import dotenv from "dotenv";

return dotenv.config();

 export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
};

if (!env.MONGO_URI) {
   throw new Error("MONGO_URI is missing in .env");
}