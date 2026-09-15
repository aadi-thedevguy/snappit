import "server-only";
import { createDb } from "@snappit/db";
const globalForDb = globalThis as unknown as { database: ReturnType<typeof createDb> | undefined };
const database = globalForDb.database ?? createDb(process.env.DATABASE_URL!, { ssl: false, max: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.database = database;
export const db = database.db;
