import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import roomRouter from "./routes/room.routes.js";
import meetingRoutes from "./routes/meeting.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, "../../frontend/dist");

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);

// Allow localhost, local LAN IPs (10.x, 192.168.x, 172.x), and env.clientUrl
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (req, res) => res.json({ ok: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  message: {
    success: false,
    message: "Too many authentication requests, please try again later.",
  },
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/rooms", roomRouter);
app.use("/api/v1/meetings", meetingRoutes);

// Serve Frontend static files directly from Backend so http://localhost:4000 works out of the box!
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  app.get("/", (req, res) =>
    res.json({
      message: "SyncMeet Backend API is running",
      health: "/api/health",
    }),
  );
}

app.use(errorHandler);

export default app;
