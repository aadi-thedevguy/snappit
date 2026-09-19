import test from "node:test";
import assert from "node:assert/strict";
import { uploadedVideoEvent } from "../src/index.js";

const videoId = "a0000000-0000-4000-8000-000000000001";
test("upload event accepts a UUID record ID and strips extra fields", () => {
  assert.deepEqual(uploadedVideoEvent.parse({ videoId, storageKey: "ignored" }), { videoId });
});
test("upload event rejects invalid record IDs", () => {
  for (const id of ["", "../video", "https://example.com", "a".repeat(201), null, 123]) {
    assert.equal(uploadedVideoEvent.safeParse({ videoId: id }).success, false);
  }
});
