import test from "node:test";
import assert from "node:assert/strict";
import { uploadedVideoEvent } from "../src/index.js";

test("upload event accepts a durable ID and strips extra fields", () => {
  assert.deepEqual(uploadedVideoEvent.parse({ videoId: "video-123_abc", url: "unused" }), { videoId: "video-123_abc" });
});
test("upload event rejects invalid and overlong IDs", () => {
  for (const videoId of ["", "../video", "https://example.com", "a".repeat(201), null, 123]) {
    assert.equal(uploadedVideoEvent.safeParse({ videoId }).success, false);
  }
});
