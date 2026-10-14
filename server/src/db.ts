// src/db.ts
import mongoose from "mongoose";

export async function connectDatabase(uri: string | undefined): Promise<void> {
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(uri);
}

// readyState 1 means connected
export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
