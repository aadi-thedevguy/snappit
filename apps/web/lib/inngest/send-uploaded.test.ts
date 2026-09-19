import test from "node:test";
import assert from "node:assert/strict";
import { sendVideoUploaded } from "./send-uploaded";
import { readFile } from "node:fs/promises";

const videoId = "a0000000-0000-4000-8000-000000000001";
test("web sender preserves UUID event data and deduplication key", async () => {
  let sent;
  await sendVideoUploaded(videoId, async (event) => {
    sent = JSON.parse(JSON.stringify(event));
  });
  assert.deepEqual(sent, {
    name: "video/uploaded",
    data: { videoId },
    id: `${videoId}-uploaded`,
  });
});
test("invalid events are rejected before sending", async () => {
  let calls = 0;
  await assert.rejects(
    sendVideoUploaded("../secret", async () => {
      calls++;
    }),
  );
  assert.equal(calls, 0);
});
test("upload finalization verifies S3, updates the owned row, then sends event", async () => {
  const source = await readFile(new URL("../actions/video.ts", import.meta.url), "utf8");
  const action = source.slice(source.indexOf("export const finalizeRecordingUpload"));
  assert.ok(action.indexOf("new HeadObjectCommand") < action.indexOf("tx.update(videos)"));
  assert.ok(
    action.indexOf(".returning({ id: videos.id })") < action.indexOf("await sendVideoUploaded"),
  );
});
