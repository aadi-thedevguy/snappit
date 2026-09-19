export type VideoProcessingStatus = "uploading" | "uploaded" | "processing" | "ready" | "failed";
export const RAW_VIDEO_CONTENT_TYPE = "video/webm";
export const PROCESSED_VIDEO_CONTENT_TYPE = "video/mp4";
export const THUMBNAIL_CONTENT_TYPE = "image/jpeg";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertVideoId(videoId: string): void {
  if (!UUID_PATTERN.test(videoId)) throw new Error("videoId must be a UUID");
}

function encodePathSegment(value: string): string {
  if (!value) throw new Error("userId must not be empty");
  return encodeURIComponent(value).replace(/\./g, "%2E");
}

export function getRawVideoStorageKey(userId: string, videoId: string): string {
  assertVideoId(videoId);
  return `${encodePathSegment(userId)}/videos/raw/${videoId}.webm`;
}

export function getProcessedVideoStorageKey(userId: string, videoId: string): string {
  assertVideoId(videoId);
  return `${encodePathSegment(userId)}/videos/processed/${videoId}.mp4`;
}

export function getThumbnailStorageKey(userId: string, videoId: string): string {
  assertVideoId(videoId);
  return `${encodePathSegment(userId)}/thumbnails/${videoId}.jpg`;
}

export const getVideoObjectKey = (key: string) => key;
