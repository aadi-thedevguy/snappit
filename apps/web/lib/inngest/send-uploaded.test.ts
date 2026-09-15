import test from "node:test";
import assert from "node:assert/strict";
import { sendVideoUploaded } from "./send-uploaded";
import { readFile } from "node:fs/promises";

test("web sender preserves event name, durable ID and deduplication key", async () => {
  let sent;
  await sendVideoUploaded("video-123", async event => { sent = JSON.parse(JSON.stringify(event)); });
  assert.deepEqual(sent, { name: "video/uploaded", data: { videoId: "video-123" }, id: "video-123-uploaded" });
});
test("invalid events are rejected before sending", async () => {
  let calls = 0;
  await assert.rejects(sendVideoUploaded("../secret", async () => { calls++; }));
  assert.equal(calls, 0);
});
test("upload action verifies S3, then inserts DB record, then sends event", async () => {
  const source = await readFile(new URL("../actions/video.ts", import.meta.url), "utf8");
  const action = source.slice(source.indexOf("export const saveVideoDetails"));
  assert.ok(action.indexOf("new HeadObjectCommand") < action.indexOf(".insert(videos)"));
  assert.ok(action.indexOf(".returning()") < action.indexOf("await sendVideoUploaded"));
});
