// Run inside the built container via stdin; uses only built-in Node modules.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

assert.notEqual(process.getuid(), 0, "worker must run as non-root");
const packages = await readdir("/app/node_modules/.pnpm");
assert.deepEqual(packages.filter(name => /^(typescript|tsx|turbo|eslint|next|react)@/.test(name)), [], "development or web dependencies leaked into the worker image");
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert.ok(!/^\.env(?:\.|$)/.test(entry.name), `environment file found at ${directory}`);
    if (entry.isDirectory()) await scan(join(directory, entry.name));
  }
}
await scan("/app");
const { readConfig } = await import("/app/dist/config.js");
assert.throws(() => readConfig({ NODE_ENV: "production" }), /Invalid worker configuration/);
await import("/app/dist/functions/transcode-video-to-mp4.js");
const { runFfmpeg, transcodeToMp4, withMediaDirectory } = await import("/app/dist/media/ffmpeg.js");
const config = { FFMPEG_PATH: "/usr/bin/ffmpeg", FFMPEG_TIMEOUT_MS: 30000 };
await withMediaDirectory(async directory => {
  const input = join(directory, "input.mkv");
  const output = join(directory, "output.mp4");
  await runFfmpeg(["-f", "lavfi", "-i", "testsrc=size=161x121:rate=5", "-t", "0.4", "-c:v", "ffv1", input], config);
  await transcodeToMp4(input, output, config);
  const bytes = await readFile(output);
  assert.ok(bytes.indexOf("moov") > 0 && bytes.indexOf("moov") < bytes.indexOf("mdat"));
  await runFfmpeg(["-i", output, "-f", "null", "-"], config);
}, "/var/tmp/snappit-media");
assert.deepEqual(await readdir("/var/tmp/snappit-media"), []);
console.log("PASS: non-root runtime, no environment files or web/dev dependencies, valid config guard, compiled imports, FFmpeg encode/decode, faststart and cleanup");
