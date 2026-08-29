import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export * from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

/**
 * Lazily-created singleton. Next.js re-imports modules on every hot reload, so
 * creating the pool at module scope leaks connections in dev — and Neon counts
 * them.
 */
export function db() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _db = drizzle(postgres(url, { max: 5 }), { schema });
  }
  return _db;
}
