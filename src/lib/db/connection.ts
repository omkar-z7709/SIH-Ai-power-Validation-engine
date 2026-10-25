import mongoose from "mongoose";
import dns from "dns";

// Ensure Node resolves Atlas SRV records even if local loopback DNS (127.0.0.1) rejects SRV queries
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (dnsErr) {
  console.warn("DNS server configuration note:", dnsErr);
}

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/aicte_doc_checker";

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: CachedConnection | undefined;
}

const cached: CachedConnection = global.mongooseCache || { conn: null, promise: null };
if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectDB(): Promise<typeof mongoose | null> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
    console.log("MongoDB connection established successfully to:", MONGODB_URI.split("@")[1] || "localhost");
    return cached.conn;
  } catch (err: any) {
    console.error("MongoDB connection failed:", err.message);
    cached.promise = null;
    return null;
  }
}
