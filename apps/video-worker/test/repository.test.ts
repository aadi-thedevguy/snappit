import test from "node:test";
import assert from "node:assert/strict";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import type { Database } from "@snappit/db";
import { NonRetriableError } from "inngest";
import { createVideoRepository } from "../src/repository.js";

function fixture(status = "uploaded", owner: string | null = null) {
  const row = { id: "row-1", videoId: "video-1", rawVideoId: "raw/video-1.webm", processedVideoId: status === "ready" ? "processed/video-1.mp4" : null, processingStatus: status, processingRunId: owner };
  const updates: { values: Record<string, unknown>; where?: SQL }[] = [];
  const tx = {
    select: () => ({ from: () => ({ where: () => ({ for: async () => [row] }) }) }),
    update: () => ({ set: (values: Record<string, unknown>) => {
      const update: typeof updates[number] = { values }; updates.push(update);
      return { where: (where: SQL) => { update.where = where; return Object.assign(Promise.resolve(), { returning: async () => [{ id: row.id }] }); } };
    } }),
  };
  const db = { ...tx, transaction: async (work: (db: typeof tx) => unknown) => work(tx) } as unknown as Database;
  return { repository: createVideoRepository(db), updates };
}
test("claim stores run ownership and clears errors; ready rows are untouched", async () => {
  const s = fixture();
  const video = await s.repository.claim("video-1", "run-1");
  assert.equal(video?.runId, "run-1");
  assert.equal(s.updates[0].values.processingStatus, "processing");
  assert.equal(s.updates[0].values.processingRunId, "run-1");
  assert.equal(s.updates[0].values.processingError, null);
  const ready = fixture("ready");
  assert.equal((await ready.repository.claim("video-1", "run-2"))?.alreadyReady, true);
  assert.equal(ready.updates.length, 0);
});
test("another active run cannot be taken over", async () => {
  const s = fixture("processing", "newer-run");
  await assert.rejects(s.repository.claim("video-1", "old-run"), NonRetriableError);
  assert.equal(s.updates.length, 0);
});
test("completion and failure SQL guard both ownership and processing status", async () => {
  const s = fixture();
  await s.repository.ready({ id: "row-1", videoId: "video-1", rawVideoId: "raw/video-1.webm", processedVideoId: null, alreadyReady: false, runId: "run-1" }, "processed/video-1.mp4");
  await s.repository.fail("video-1", "run-1");
  for (const update of s.updates) {
    const query = new PgDialect().sqlToQuery(update.where!);
    assert.match(query.sql, /"processing_run_id"/);
    assert.match(query.sql, /"processing_status"/);
    assert.ok(query.params.includes("processing"));
    assert.ok(query.params.includes("run-1"));
  }
  assert.equal(s.updates[0].values.processingStatus, "ready");
  assert.equal(s.updates[1].values.processingStatus, "failed");
  assert.equal(s.updates[1].values.processingError, "Video processing failed. Please upload the video again.");
});
