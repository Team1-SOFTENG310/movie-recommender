import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.spec.{ts,js}", "test/**/*.spec.{ts,js}"],
    restoreMocks: true,
    unstubEnvs: true,
  },
});