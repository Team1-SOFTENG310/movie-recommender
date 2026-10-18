import { Server } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { testConfig } from "../test/fixtures.js";
import { startServer, type Listenable } from "./startServer.js";

// A real but never-listening Server, so tests can check identity without a cast
function fakeApp() {
  const server = new Server();
  const listen = vi.fn<Listenable["listen"]>(() => server);
  return { server, listen, appFactory: vi.fn(() => ({ listen })) };
}

const fakeLogger = () => ({ log: vi.fn(), warn: vi.fn() });

describe("startServer", () => {
  it("waits for MongoDB before creating and listening on the app", async () => {
    let finishConnection = () => {};
    const databaseConnector = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishConnection = resolve;
        }),
    );
    const { server, listen, appFactory } = fakeApp();
    const config = { ...testConfig, port: 5001 };

    const startup = startServer({ config, databaseConnector, appFactory, logger: fakeLogger() });

    expect(databaseConnector).toHaveBeenCalledOnce();
    expect(appFactory).not.toHaveBeenCalled();
    expect(listen).not.toHaveBeenCalled();

    finishConnection();
    await expect(startup).resolves.toBe(server);

    expect(appFactory).toHaveBeenCalledWith(config);
    expect(listen).toHaveBeenCalledWith(5001, expect.any(Function));
  });

  it("does not create or listen on the app when MongoDB connection fails", async () => {
    const databaseError = new Error("Database unavailable");
    const databaseConnector = vi.fn<() => Promise<void>>().mockRejectedValue(databaseError);
    const { appFactory } = fakeApp();

    await expect(
      startServer({
        config: testConfig,
        databaseConnector,
        appFactory,
        allowDatabaseUnavailable: false,
      }),
    ).rejects.toBe(databaseError);

    expect(appFactory).not.toHaveBeenCalled();
  });

  it("starts in degraded mode when MongoDB is unavailable outside production", async () => {
    const databaseConnector = vi
      .fn<() => Promise<void>>()
      .mockRejectedValue(new Error("Database unavailable"));
    const { server, listen, appFactory } = fakeApp();
    const logger = fakeLogger();

    await expect(
      startServer({
        config: testConfig,
        databaseConnector,
        appFactory,
        logger,
        allowDatabaseUnavailable: true,
      }),
    ).resolves.toBe(server);

    expect(logger.warn).toHaveBeenCalledWith(
      "MongoDB is unavailable; starting in degraded mode:",
      "Database unavailable",
    );
    expect(listen).toHaveBeenCalledOnce();
  });

  it("only allows degraded mode outside production by default", async () => {
    const databaseError = new Error("Database unavailable");
    const databaseConnector = vi.fn<() => Promise<void>>().mockRejectedValue(databaseError);
    const { appFactory } = fakeApp();

    await expect(
      startServer({
        config: { ...testConfig, isProduction: true },
        databaseConnector,
        appFactory,
        logger: fakeLogger(),
      }),
    ).rejects.toBe(databaseError);

    await expect(
      startServer({
        config: { ...testConfig, isProduction: false },
        databaseConnector,
        appFactory,
        logger: fakeLogger(),
      }),
    ).resolves.toBeInstanceOf(Server);
  });

  it("connects using config.mongoUri by default", async () => {
    const { appFactory } = fakeApp();
    const logger = fakeLogger();

    // No URI, so connectDatabase rejects without touching Mongoose
    await startServer({ config: { ...testConfig, mongoUri: undefined }, appFactory, logger });

    expect(logger.warn).toHaveBeenCalledWith(
      "MongoDB is unavailable; starting in degraded mode:",
      "MONGODB_URI is required",
    );
  });
});
