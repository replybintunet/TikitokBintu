import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Check if DATABASE_URL is set, if not we can fall back to memory or warn
// For this app, we primarily use memory state, but the template requires this file.
if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set. Database features will not work.");
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || "postgres://user:password@localhost:5432/db" 
});
export const db = drizzle(pool, { schema });
