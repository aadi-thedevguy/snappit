import test from "node:test";
import assert from "node:assert/strict";
import { getRawVideoStorageKey, getProcessedVideoStorageKey, getVideoObjectKey } from "../src/keys.js";

test("raw and processed keys preserve the existing S3 prefix contract", () => {
  assert.equal(getRawVideoStorageKey("video-1"), "raw/video-1.webm");
  assert.equal(getProcessedVideoStorageKey("video-1"), "processed/video-1.mp4");
  assert.equal(getVideoObjectKey(getRawVideoStorageKey("video-1")), "videos/raw/video-1.webm");
  assert.equal(getVideoObjectKey(getProcessedVideoStorageKey("video-1")), "videos/processed/video-1.mp4");
  assert.equal(getVideoObjectKey("videos/legacy"), "videos/legacy");
  assert.equal(getVideoObjectKey("legacy"), "videos/legacy");
});
