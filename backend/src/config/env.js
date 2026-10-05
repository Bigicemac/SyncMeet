import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const env = {
  port: process.env.PORT || 4000,
  mongoUri:
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    "mongodb+srv://prathamsawant:prathamsawant123@cluster0.wtaryqu.mongodb.net/syncmeet?retryWrites=true&w=majority",
  jwtSecret:
    process.env.JWT_SECRET ||
    "b6333976fc6334dd39692a9620c36ce493ef144631877fa3f0761a9c49f0d90a",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientUrl: process.env.CLIENT_URL || "*",
};
