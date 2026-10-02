// import {
//   env
// } from "./config/env.js";
// import {
//   connectDB
// } from "./database/index.js";
// import app from "./app.js";

// async function start() {
//   try {
//     await connectDB();
//     app.listen(env.port, () => console.log(`Server running on http://localhost:${env.port}`));
//   } catch (err) {
//     console.error("Failed to start:", err); console.error("Reason:", err.reason);
//     console.error("If you use Atlas, check that your IP is whitelisted under Network Access.");
//     process.exit(1);
//   }
// }

// start();



import http from "http";
import {
  env
} from "./config/env.js";
import {
  connectDB
} from "./database/index.js";
import app from "./app.js";
import {

  initSocket

} from "./socket/index.js";

async function start() {
  try {
    await connectDB();
    const server = http.createServer(app);
    initSocket(server);
    server.listen(env.port, () => console.log(`Server running on http://localhost:${env.port}`));
  } catch (err) {
    console.error("Failed to start:", err); console.error("Reason:", err.reason);
    console.error("If you use Atlas, check that your IP is whitelisted under Network Access.");
    process.exit(1);
  }
}

start();