/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Optional because a missing .env entry is undefined at runtime;
  // read it through getTmdbApiKey(), which reports a missing key.
  readonly VITE_TMDB_API_KEY?: string;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
