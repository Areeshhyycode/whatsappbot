import mongoose from "mongoose";

/**
 * Connects to MongoDB and reuses the connection.
 *
 * Next.js reloads modules a lot in development, which would open a new
 * database connection every time. We cache the connection on `globalThis`
 * so it survives those reloads and we only ever connect once.
 */
let cached = globalThis._mongoose;
if (!cached) {
  cached = globalThis._mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  // Read the env var here (not at module top) so it works whether the
  // caller is Next.js or the standalone bot worker.
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to your .env file.");
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri).then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
