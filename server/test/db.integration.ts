// Live MongoDB check, run with `npm run test:db`; not a spec file, so Vitest skips it
import assert from "node:assert/strict";
import path from "node:path";
import { after, before, test } from "node:test";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDatabase } from "../src/db.js";

dotenv.config({ path: path.resolve(import.meta.dirname, "../../.env") });

before(async () => {
  assert.ok(process.env.MONGODB_URI, "MONGODB_URI must be configured in the root .env file");
  await connectDatabase(process.env.MONGODB_URI);
});

after(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

test("connects to MongoDB", () => {
  assert.equal(mongoose.connection.readyState, 1);
  assert.ok(mongoose.connection.db);
});

test("MongoDB responds to an admin ping", async () => {
  const db = mongoose.connection.db;
  assert.ok(db);
  const response = await db.admin().ping();

  assert.equal(response.ok, 1);
});
