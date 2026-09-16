export type VideoProcessingStatus = "uploaded" | "processing" | "ready" | "failed";
export const RAW_VIDEO_CONTENT_TYPE = "video/webm";
export const PROCESSED_VIDEO_CONTENT_TYPE = "video/mp4";
export const getRawVideoStorageKey = (id: string) => `raw/${id}.webm`;
export const getProcessedVideoStorageKey = (id: string) => `processed/${id}.mp4`;
export const getVideoObjectKey = (key: string) => key.startsWith("videos/") ? key : `videos/${key}`;
