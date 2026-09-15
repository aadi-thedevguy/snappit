import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { NonRetriableError } from "inngest";
import type { execa } from "execa";
import { mp4Arguments, runFfmpeg, withMediaDirectory } from "../src/media/ffmpeg.js";

const config = { FFMPEG_PATH: "/usr/bin/ffmpeg", FFMPEG_TIMEOUT_MS: 12345 };
test("FFmpeg receives a safe argument array and configured executable/timeout", async () => {
  const args = mp4Arguments("/tmp/input with spaces", "/tmp/output.mp4");
  const execute = (async (file: string, received: string[], options: { timeout: number }) => {
    assert.equal(file, config.FFMPEG_PATH);
    assert.equal(options.timeout, config.FFMPEG_TIMEOUT_MS);
    assert.deepEqual(received.slice(0, 6), ["-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-protocol_whitelist"]);
    assert.ok(received.includes("0:a:0?"));
    assert.ok(received.includes("pad=ceil(iw/2)*2:ceil(ih/2)*2"));
    for (const value of ["libx264", "aac", "yuv420p", "+faststart", "file,pipe", "/tmp/input with spaces"]) assert.ok(received.includes(value));
    assert.equal(received.at(-1), "/tmp/output.mp4");
  }) as unknown as typeof execa;
  await runFfmpeg(args, config, execute);
});
test("corrupt media is permanent, missing binary and timeouts remain retriable", async () => {
  for (const [error, permanent] of [[{ stderr: "Invalid data found when processing input" }, true], [{ code: "ENOENT" }, false], [{ timedOut: true }, false]] as const) {
    const execute = (async () => { throw error; }) as unknown as typeof execa;
    await assert.rejects(runFfmpeg([], config, execute), result => (result instanceof NonRetriableError) === permanent);
  }
});
test("temporary directories are unique and cleaned after success and failure", async () => {
  let first = "";
  let second = "";
  await withMediaDirectory(async directory => {
    first = directory;
    await withMediaDirectory(async other => { second = other; });
  });
  assert.notEqual(first, second);
  await assert.rejects(access(first));
  await assert.rejects(access(second));
  await assert.rejects(withMediaDirectory(async directory => { first = directory; throw new Error("upload failed"); }));
  await assert.rejects(access(first));
});
