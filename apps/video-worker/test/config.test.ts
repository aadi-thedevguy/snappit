import test from "node:test";
import assert from "node:assert/strict";
import { readConfig } from "../src/config.js";

const local = { DATABASE_URL: "postgresql://example:example@localhost:5432/test", INNGEST_DEV: "1", S3_BUCKET_NAME: "test", AWS_REGION: "us-east-1", APP_VERSION: "test" };
test("local mode needs no production keys and has bounded concurrency", () => {
  const config = readConfig(local);
  assert.equal(config.WORKER_CONCURRENCY, 1);
  assert.equal(config.DATABASE_POOL_SIZE, 2);
  assert.equal(config.FFMPEG_TIMEOUT_MS, 1_800_000);
});
test("cloud requires keys, production rejects dev mode and disabled TLS", () => {
  assert.throws(() => readConfig({ ...local, INNGEST_DEV: "0" }), /INNGEST_SIGNING_KEY/);
  assert.throws(() => readConfig({ ...local, NODE_ENV: "production" }), /INNGEST_DEV/);
  const production = { ...local, INNGEST_DEV: "0", NODE_ENV: "production", INNGEST_SIGNING_KEY: "test-key", INNGEST_EVENT_KEY: "test-event-key" };
  assert.equal(readConfig(production).NODE_ENV, "production");
  assert.throws(() => readConfig({ ...production, DATABASE_SSL: "disable" }), /DATABASE_SSL/);
});
test("invalid limits and partial credentials fail without exposing values", () => {
  for (const env of [{ WORKER_CONCURRENCY: "0" }, { FFMPEG_TIMEOUT_MS: "0" }, { HEALTH_PORT: "70000" }, { AWS_ACCESS_KEY_ID: "private-value" }]) {
    assert.throws(() => readConfig({ ...local, ...env }), error => error instanceof Error && !error.message.includes("private-value"));
  }
});
