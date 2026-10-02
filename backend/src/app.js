import express from "express";
import authRoutes from "./routes/auth.routes.js";
import roomRouter from "./routes/room.routes.js";
import {
  errorHandler
} from "./middleware/error.middleware.js";

const app = express();
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/v1/rooms", roomRouter);

app.use(errorHandler); // always last

export default app;



