import app from "./app.js";
import { createServer } from "node:http";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { initSocketServer } from "./socket/index.js";

const server = createServer(app);
initSocketServer(server);

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌ Error: Port ${env.port} is already in use by another running process.`);
    console.error(`👉 Run 'lsof -ti:${env.port} | xargs kill -9' to free port ${env.port}, then run 'npm start' again.\n`);
    process.exit(1);
  } else {
    console.error("Server error:", err);
  }
});

connectDB()
  .then(() => {
    server.listen(env.port, () => {
      console.log(`Server listening on port ${env.port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
  });
