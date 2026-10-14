import path from "node:path";
import dotenv from "dotenv";
import { loadConfig } from "./config.js";
import { startServer } from "./startServer.js";

// Root .env; same relative path works from src/ (tsx) and dist/ (node)
dotenv.config({ path: path.resolve(import.meta.dirname, "../../.env") });

try {
  await startServer({ config: loadConfig() });
} catch (error) {
  console.error("Server startup failed:", error);
  process.exitCode = 1;
}
