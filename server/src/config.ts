export interface AppConfig {
  port: number;
  frontendOrigin: string;
  tmdbApiKey: string;
  // Optional until Members 1/3 need them
  mongoUri?: string;
  jwtSecret?: string;
  llmApiKey?: string;
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
    mongoUri: env.MONGODB_URI,
    jwtSecret: env.JWT_SECRET,
    llmApiKey: env.LLM_API_KEY,
  };
}
