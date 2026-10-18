export interface AppConfig {
  port: number;
  frontendOrigin: string;
  tmdbApiKey: string;
  // NODE_ENV=production; outside production the server starts without MongoDB
  isProduction: boolean;
  // Optional: without it the server runs in degraded mode (see startServer.ts)
  mongoUri?: string;
  // Optional until Members 1/3 need them
  jwtSecret?: string;
  llmApiKey?: string;
  // Required in production; a fixed development secret is used otherwise
  sessionSecret?: string;
}

function parsePort(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value.trim() === "") return fallback;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be a valid port number, got "${value}"`);
  }
  return port;
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const tmdbApiKey = nonEmpty(env.TMDB_API_KEY) ?? nonEmpty(env.VITE_TMDB_API_KEY);
  if (!tmdbApiKey) {
    throw new Error("Missing TMDB API key: set TMDB_API_KEY (or VITE_TMDB_API_KEY) in the root .env");
  }

  const frontendPort = parsePort(env.VITE_FRONTEND_PORT, 5173, "VITE_FRONTEND_PORT");

  return {
    port: parsePort(env.BACKEND_PORT, 5000, "BACKEND_PORT"),
    frontendOrigin: `http://localhost:${frontendPort}`,
    tmdbApiKey,
    isProduction: env.NODE_ENV === "production",
    mongoUri: nonEmpty(env.MONGODB_URI),
    jwtSecret: env.JWT_SECRET,
    // OPENAI_API_KEY is the name the OpenAI SDK and docs use
    llmApiKey: nonEmpty(env.LLM_API_KEY) ?? nonEmpty(env.OPENAI_API_KEY),
    sessionSecret: nonEmpty(env.SESSION_SECRET),
  };
}
