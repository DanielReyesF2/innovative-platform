import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import WebSocket from "ws";
import * as schema from "../shared/schema/index";

// Configure WebSocket for Neon in Node.js environment
neonConfig.webSocketConstructor = WebSocket;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Pool config for serverless/multi-instance (Cloud Run):
// max=5 keeps total DB connections under control with --max-instances=10.
// idleTimeout closes idle connections so Neon doesn't keep them pinned.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});
export const db = drizzle({ client: pool, schema });
