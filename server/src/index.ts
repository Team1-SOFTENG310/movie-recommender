import path from "node:path";
import dotenv from "dotenv";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

// Root .env; same relative path works from src/ (tsx) and dist/ (node)
dotenv.config({ path: path.resolve(import.meta.dirname, "../../.env") });

const config = loadConfig();
// Member 1: connect to Mongo here when config.mongoUri is set

createApp(config).listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
