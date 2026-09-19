import test from "node:test";
import assert from "node:assert/strict";
import { NonRetriableError } from "inngest";
import { createHandlers, type ClaimedVideo, type Steps } from "../src/functions/handlers.js";
import { createInngestClient } from "@snappit/inngest";
import { createTranscodeVideoToMp4 } from "../src/functions/transcode-video-to-mp4.js";

const videoId = "a0000000-0000-4000-8000-000000000001";
const processedKey = `owner-1/videos/processed/${videoId}.mp4`;
function setup(options: { ready?: boolean; missing?: boolean; failRender?: boolean } = {}) {
  const calls: string[] = [];
  let status = options.ready ? "ready" : "uploaded";
  const row: ClaimedVideo = {
    id: videoId,
    userId: "owner-1",
    rawVideoId: `owner-1/videos/raw/${videoId}.webm`,
    processedVideoId: options.ready ? processedKey : null,
    processingStatus: status,
    alreadyReady: !!options.ready,
    runId: "run-1",
  };
  const repository = {
    async claim(id: string, run: string) {
      calls.push(`claim:${id}:${run}`);
      if (options.missing) return;
      if (!options.ready) status = "processing";
      return row;
    },
    async ready(_row: ClaimedVideo, key: string) {
      calls.push(`ready:${key}`);
      status = "ready";
      return true;
    },
    async fail(id: string, run: string) {
      calls.push(`fail:${id}:${run}`);
      status = "failed";
    },
  };
  const render = async (raw: string, processed: string) => {
    assert.equal(status, "processing");
    calls.push(`render:${raw}:${processed}`);
    if (options.failRender) throw new Error("S3 temporarily unavailable");
    return { storageKey: processed, renderTimeMs: 10 };
  };
  const step: Steps = {
    async run(id, work) {
      calls.push(id);
      return work();
    },
  };
  const logger = { info() {}, error() {} };
  return {
    handlers: createHandlers({ repository, render }),
    calls,
    getStatus: () => status,
    context: { event: { data: { videoId } }, step, logger, runId: "run-1" },
  };
}
test("already ready record skips rendering", async () => {
  const s = setup({ ready: true });
  assert.deepEqual(await s.handlers.process(s.context), {
    videoId,
    processedVideoId: processedKey,
  });
  assert.deepEqual(s.calls, ["mark-processing", `claim:${videoId}:run-1`]);
});
test("missing row and invalid UUID events are permanent failures", async () => {
  const missing = setup({ missing: true });
  await assert.rejects(missing.handlers.process(missing.context), NonRetriableError);
  const invalid = setup();
  await assert.rejects(
    invalid.handlers.process({ ...invalid.context, event: { data: { videoId: "not-uuid" } } }),
    NonRetriableError,
  );
  assert.deepEqual(invalid.calls, []);
});
test("processing uses only database-derived owner and UUID object keys", async () => {
  const s = setup();
  await s.handlers.process(s.context);
  assert.deepEqual(s.calls, [
    "mark-processing",
    `claim:${videoId}:run-1`,
    "transcode-and-upload-mp4",
    `render:owner-1/videos/raw/${videoId}.webm:${processedKey}`,
    "mark-ready",
    `ready:${processedKey}`,
  ]);
  assert.equal(s.getStatus(), "ready");
});
test("transient failure stays retriable; terminal callback updates the owning run", async () => {
  const s = setup({ failRender: true });
  await assert.rejects(
    s.handlers.process(s.context),
    (error) => error instanceof Error && !(error instanceof NonRetriableError),
  );
  assert.equal(s.getStatus(), "processing");
  await s.handlers.failure({
    ...s.context,
    event: { data: { event: s.context.event, run_id: "run-1" } },
  });
  assert.equal(s.getStatus(), "failed");
  assert.ok(s.calls.includes(`fail:${videoId}:run-1`));
});
test("invalid terminal event is ignored", async () => {
  const s = setup();
  await s.handlers.failure({
    ...s.context,
    event: { data: { event: { data: {} }, run_id: "run-1" } },
  });
  assert.deepEqual(s.calls, []);
});
test("SDK registration preserves bounded concurrency and UUID idempotency", () => {
  const s = setup();
  const fn = createTranscodeVideoToMp4(createInngestClient({ appId: "test", isDev: true }), {
    repository: { claim: async () => undefined, ready: async () => false, fail: async () => {} },
    render: async () => ({ storageKey: "", renderTimeMs: 0 }),
  });
  assert.equal(fn.opts.id, "transcode-video-to-mp4");
  assert.equal(fn.opts.retries, 2);
  assert.deepEqual(fn.opts.concurrency, { limit: 2 });
  void s;
});
