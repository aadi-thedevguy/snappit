import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export function createDb(
  url: string,
  options: { max?: number; ssl?: false | "require" | "verify-full" } = {},
) {
  const client = postgres(url, {
    prepare: false,
    max: options.max ?? 2,
    ...(options.ssl !== undefined ? { ssl: options.ssl } : {}),
  });
  return { db: drizzle(client, { schema }), close: () => client.end({ timeout: 10 }) };
}
export type Database = ReturnType<typeof createDb>["db"];
