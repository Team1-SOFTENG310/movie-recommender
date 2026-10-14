// src/startServer.ts
import type { Server } from "node:http";
import { createApp } from "./app.js";
import type { AppConfig } from "./config.js";
import { connectDatabase } from "./db.js";

export interface Listenable {
  listen(port: number, callback: () => void): Server;
}

export interface StartServerOptions {
  config: AppConfig;
  databaseConnector?: () => Promise<void>;
  appFactory?: (config: AppConfig) => Listenable;
  allowDatabaseUnavailable?: boolean;
  logger?: Pick<Console, "log" | "warn">;
}

// Connects to MongoDB before listening. Outside production, a failed connection
// is logged and the server starts anyway ("degraded mode"); /api/health reports it.
export async function startServer({
  config,
  databaseConnector = () => connectDatabase(config.mongoUri),
  appFactory = createApp,
  allowDatabaseUnavailable = !config.isProduction,
  logger = console,
}: StartServerOptions): Promise<Server> {
  try {
    await databaseConnector();
  } catch (error) {
    if (!allowDatabaseUnavailable) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    logger.warn("MongoDB is unavailable; starting in degraded mode:", message);
  }

  const app = appFactory(config);
  return app.listen(config.port, () => logger.log(`Server running on port ${config.port}`));
}
