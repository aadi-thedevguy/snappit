import test from "node:test";
import assert from "node:assert/strict";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import type { Database } from "@snappit/db";
import { NonRetriableError } from "inngest";
import { createVideoRepository } from "../src/repository.js";

const videoId = "a0000000-0000-4000-8000-000000000001";
function fixture(status = "uploaded", owner: string | null = null) {
  const row = {
    id: videoId,
    userId: "owner-1",
    videoId: null,
    rawVideoId: `owner-1/videos/raw/${videoId}.webm`,
    processedVideoId: status === "ready" ? `owner-1/videos/processed/${videoId}.mp4` : null,
    processingStatus: status,
    processingRunId: owner,
  };
  const updates: { values: Record<string, unknown>; where?: SQL }[] = [];
  const tx = {
    select: () => ({ from: () => ({ where: () => ({ for: async () => [row] }) }) }),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        const update: (typeof updates)[number] = { values };
        updates.push(update);
        return {
          where: (where: SQL) => {
            update.where = where;
            return Object.assign(Promise.resolve(), { returning: async () => [{ id: row.id }] });
          },
        };
      },
    }),
  };
  const db = {
    ...tx,
    transaction: async (work: (db: typeof tx) => unknown) => work(tx),
    update: tx.update,
  } as unknown as Database;
  return { repository: createVideoRepository(db), updates };
}
test("claim stores run ownership and clears errors; ready rows are untouched", async () => {
  const s = fixture();
  const video = await s.repository.claim(videoId, "run-1");
  assert.equal(video?.runId, "run-1");
  assert.equal(video?.userId, "owner-1");
  assert.equal(s.updates[0].values.processingStatus, "processing");
  assert.equal(s.updates[0].values.processingRunId, "run-1");
  assert.equal(s.updates[0].values.processingError, null);
  const ready = fixture("ready");
  assert.equal((await ready.repository.claim(videoId, "run-2"))?.alreadyReady, true);
  assert.equal(ready.updates.length, 0);
});
test("another active run cannot be taken over and uploading rows cannot be claimed", async () => {
  const s = fixture("processing", "newer-run");
  await assert.rejects(s.repository.claim(videoId, "old-run"), NonRetriableError);
  assert.equal(s.updates.length, 0);
  const pending = fixture("uploading");
  await assert.rejects(pending.repository.claim(videoId, "run-1"), NonRetriableError);
});
test("completion and failure SQL guard run ownership and processing status", async () => {
  const s = fixture();
  const video = await s.repository.claim(videoId, "run-1");
  await s.repository.ready(video!, `owner-1/videos/processed/${videoId}.mp4`);
  await s.repository.fail(videoId, "run-1");
  for (const update of s.updates.slice(1)) {
    const query = new PgDialect().sqlToQuery(update.where!);
    assert.match(query.sql, /"processing_run_id"/);
    assert.match(query.sql, /"processing_status"/);
    assert.ok(query.params.includes("processing"));
    assert.ok(query.params.includes("run-1"));
  }
  assert.equal(s.updates[1].values.processingStatus, "ready");
  assert.equal(s.updates[2].values.processingStatus, "failed");
});
