import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
config({ path: "./apps/web/.env" });

export default defineConfig({
  schema: "./packages/db/src/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
