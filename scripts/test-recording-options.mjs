/**
 * Node-only feedback loop for recording mime selection.
 * Does not launch a browser.
 *
 * Exit 0 = assertions pass
 * Exit 1 = failure
 *
 * Usage: node scripts/test-recording-options.mjs
 */

import assert from "node:assert/strict";

const AUDIO_MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

const VIDEO_ONLY_MIME_CANDIDATES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

function pickRecordingMimeType(hasAudio, isTypeSupported) {
  const candidates = hasAudio
    ? AUDIO_MIME_CANDIDATES
    : VIDEO_ONLY_MIME_CANDIDATES;
  return candidates.find((type) => isTypeSupported(type)) ?? "";
}

function buildMediaRecorderOptions(stream, isTypeSupported) {
  const hasAudio = stream.getAudioTracks().length > 0;
  const mimeType = pickRecordingMimeType(hasAudio, isTypeSupported);
  const options = { videoBitsPerSecond: 2_500_000 };
  if (mimeType) options.mimeType = mimeType;
  if (hasAudio) options.audioBitsPerSecond = 128_000;
  return options;
}

// --- RED case the app used to hit: video-only + hardcoded vp9,opus ---
const videoOnly = { getAudioTracks: () => [] };
const buggyHardcoded = {
  mimeType: "video/webm;codecs=vp9,opus",
  audioBitsPerSecond: 128000,
  videoBitsPerSecond: 2500000,
  width: 1920,
  height: 1080,
  frameRate: 30,
};

assert.equal(
  buggyHardcoded.mimeType.includes("opus"),
  true,
  "legacy config requests opus even when stream may have no audio",
);
assert.ok(
  "width" in buggyHardcoded,
  "legacy config passed non-MediaRecorder keys (width/height/frameRate)",
);

// Browser that supports vp9 but rejects opus on video-only streams
const isTypeSupportedVideoOnlySafe = (type) =>
  !type.includes("opus") &&
  (type === "video/webm;codecs=vp9" ||
    type === "video/webm;codecs=vp8" ||
    type === "video/webm");

const fixedVideoOnly = buildMediaRecorderOptions(
  videoOnly,
  isTypeSupportedVideoOnlySafe,
);

assert.equal(fixedVideoOnly.mimeType, "video/webm;codecs=vp9");
assert.equal(fixedVideoOnly.audioBitsPerSecond, undefined);
assert.equal("width" in fixedVideoOnly, false);

// With audio: prefer vp9+opus when supported
const withAudio = { getAudioTracks: () => [{}] };
const fixedAv = buildMediaRecorderOptions(withAudio, (type) =>
  [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp9",
    "video/webm",
  ].includes(type),
);
assert.equal(fixedAv.mimeType, "video/webm;codecs=vp9,opus");
assert.equal(fixedAv.audioBitsPerSecond, 128_000);

console.log("GREEN: recording options helper picks video-only mime without opus");
process.exit(0);
