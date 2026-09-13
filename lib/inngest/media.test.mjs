import assert from "node:assert/strict";
import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { runFfmpeg, transcodeToMp4, withMediaDirectory } from "./media.ts";

test("media directories are unique and removed after success and failure", async () => {
  let first;
  let second;
  await withMediaDirectory(async (directory) => {
    first = directory;
    await withMediaDirectory(async (nested) => { second = nested; });
    assert.notEqual(first, second);
  });
  await assert.rejects(access(first));
  await assert.rejects(access(second));
  let failed;
  await assert.rejects(withMediaDirectory(async (directory) => {
    failed = directory;
    throw new Error("upload failed");
  }), /upload failed/);
  await assert.rejects(access(failed));
});

for (const audio of [false, true]) {
  test(`transcodes odd-sized uploaded video, audio=${audio}, with faststart`, async () => {
    await withMediaDirectory(async (directory) => {
      const input = join(directory, "input.mkv");
      const output = join(directory, "output.mp4");
      await runFfmpeg([
        "-f", "lavfi", "-i", "testsrc=size=161x121:rate=5",
        ...(audio ? ["-f", "lavfi", "-i", "sine=frequency=440:sample_rate=44100"] : []),
        "-t", "0.4", "-c:v", "ffv1", ...(audio ? ["-c:a", "pcm_s16le"] : []), input,
      ]);
      await transcodeToMp4(input, output);
      const mp4 = await readFile(output);
      assert.ok(mp4.indexOf("moov") > 0);
      assert.ok(mp4.indexOf("moov") < mp4.indexOf("mdat"), "metadata must precede media for seeking");
      await runFfmpeg(["-i", output, "-f", "null", "-"]);
    });
  });
}

test("corrupt input rejects and cleans files before a fresh retry", async () => {
  let attemptDirectory;
  await assert.rejects(withMediaDirectory(async (directory) => {
    attemptDirectory = directory;
    const input = join(directory, "bad.webm");
    await writeFile(input, "invalid video");
    await transcodeToMp4(input, join(directory, "output.mp4"));
  }), /FFmpeg failed/);
  await assert.rejects(access(attemptDirectory));
});

test("FFmpeg timeouts terminate the process", async () => {
  await assert.rejects(runFfmpeg([
    "-re", "-f", "lavfi", "-i", "testsrc=size=16x16:rate=1", "-f", "null", "-",
  ], 100), /time limit/);
});
