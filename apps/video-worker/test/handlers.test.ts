import test from "node:test";
import assert from "node:assert/strict";
import { NonRetriableError } from "inngest";
import { createHandlers, type ClaimedVideo, type Steps } from "../src/functions/handlers.js";
import { createInngestClient } from "@snappit/inngest";
import { createTranscodeVideoToMp4 } from "../src/functions/transcode-video-to-mp4.js";

function setup(options: { ready?: boolean; missing?: boolean; failRender?: boolean } = {}) {
  const calls: string[] = [];
  let status = options.ready ? "ready" : "uploaded";
  const row: ClaimedVideo = { id: "row-1", videoId: "video-1", rawVideoId: "raw/video-1.webm", processedVideoId: options.ready ? "processed/video-1.mp4" : null, alreadyReady: !!options.ready, runId: "run-1" };
  const repository = {
    async claim(id: string, run: string) { calls.push(`claim:${id}:${run}`); if (options.missing) return; if (!options.ready) status = "processing"; return row; },
    async ready(_row: ClaimedVideo, key: string) { calls.push(`ready:${key}`); status = "ready"; return true; },
    async fail(id: string, run: string) { calls.push(`fail:${id}:${run}`); status = "failed"; },
  };
  const render = async (raw: string, processed: string) => {
    assert.equal(status, "processing");
    calls.push(`render:${raw}:${processed}`);
    if (options.failRender) throw new Error("S3 temporarily unavailable");
    return { storageKey: processed, renderTimeMs: 10 };
  };
  const step: Steps = { async run(id, work) { calls.push(id); return work(); } };
  const logger = { info() {}, error() {} };
  return { handlers: createHandlers({ repository, render }), repository, render, calls, getStatus: () => status,
    context: { event: { data: { videoId: "video-1" } }, step, logger, runId: "run-1" } };
}
test("already ready video skips rendering and status changes", async () => {
  const s = setup({ ready: true });
  assert.deepEqual(await s.handlers.process(s.context), { videoId: "video-1", processedVideoId: "processed/video-1.mp4" });
  assert.deepEqual(s.calls, ["mark-processing", "claim:video-1:run-1"]);
});
test("missing video is a permanent failure", async () => {
  const s = setup({ missing: true });
  await assert.rejects(s.handlers.process(s.context), NonRetriableError);
  assert.equal(s.calls.length, 2);
});
test("invalid event never touches database or storage", async () => {
  const s = setup();
  await assert.rejects(s.handlers.process({ ...s.context, event: { data: {} } }), NonRetriableError);
  assert.deepEqual(s.calls, []);
});
test("processing proceeds through one render step to ready", async () => {
  const s = setup();
  await s.handlers.process(s.context);
  assert.deepEqual(s.calls, ["mark-processing", "claim:video-1:run-1", "transcode-and-upload-mp4", "render:raw/video-1.webm:processed/video-1.mp4", "mark-ready", "ready:processed/video-1.mp4"]);
  assert.equal(s.getStatus(), "ready");
});
test("transient failure stays retriable; terminal callback updates the owning run", async () => {
  const s = setup({ failRender: true });
  await assert.rejects(s.handlers.process(s.context), error => error instanceof Error && !(error instanceof NonRetriableError));
  assert.equal(s.getStatus(), "processing");
  await s.handlers.failure({ ...s.context, event: { data: { event: s.context.event, run_id: "run-1" } } });
  assert.equal(s.getStatus(), "failed");
  assert.ok(s.calls.includes("fail:video-1:run-1"));
});
test("invalid terminal event is ignored", async () => {
  const s = setup();
  await s.handlers.failure({ ...s.context, event: { data: { event: { data: {} }, run_id: "run-1" } } });
  assert.deepEqual(s.calls, []);
});
test("SDK registration preserves function settings", () => {
  const s = setup();
  const fn = createTranscodeVideoToMp4(createInngestClient({ appId: "test", isDev: true }), s);
  assert.equal(fn.opts.id, "transcode-video-to-mp4");
  assert.equal(fn.opts.retries, 2);
  assert.equal(fn.opts.idempotency, "event.data.videoId");
  assert.deepEqual(fn.opts.singleton, { key: "event.data.videoId", mode: "skip" });
  assert.deepEqual(fn.opts.concurrency, { limit: 2 });
});
