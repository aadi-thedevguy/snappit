/**
 * Builds MediaRecorder options that match the actual display stream.
 * Hardcoding vp9+opus fails when the user shares without system audio
 * (video-only stream), which throws NotSupportedError after getDisplayMedia
 * already succeeded — leaving a live share with idle UI.
 */

export type IsTypeSupported = (mimeType: string) => boolean;

const AUDIO_MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
] as const;

const VIDEO_ONLY_MIME_CANDIDATES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
] as const;

const defaultIsTypeSupported: IsTypeSupported = (mimeType) =>
  typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mimeType);

export function pickRecordingMimeType(
  hasAudio: boolean,
  isTypeSupported: IsTypeSupported = defaultIsTypeSupported,
): string {
  const candidates = hasAudio ? AUDIO_MIME_CANDIDATES : VIDEO_ONLY_MIME_CANDIDATES;
  return candidates.find((type) => isTypeSupported(type)) ?? "";
}

export function buildMediaRecorderOptions(
  stream: Pick<MediaStream, "getAudioTracks">,
  isTypeSupported: IsTypeSupported = defaultIsTypeSupported,
): MediaRecorderOptions {
  const hasAudio = stream.getAudioTracks().length > 0;
  const mimeType = pickRecordingMimeType(hasAudio, isTypeSupported);
  const options: MediaRecorderOptions = {
    videoBitsPerSecond: 2_500_000,
  };
  if (mimeType) {
    options.mimeType = mimeType;
  }
  if (hasAudio) {
    options.audioBitsPerSecond = 128_000;
  }
  return options;
}
