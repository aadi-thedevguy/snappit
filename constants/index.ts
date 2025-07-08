// Size Constants
export const MAX_VIDEO_SIZE = 500 * 1024 * 1024;
export const MAX_THUMBNAIL_SIZE = 10 * 1024 * 1024;

// AWS Configuration
export const AWS_CONFIG = {
  S3_BASE_URL: `https://s3.ap-south-1.amazonaws.com`,
  CLOUDFRONT_BASE_URL: `https://d28vypb2sw9vap.cloudfront.net`,
  BUCKET_NAME: "snappit-bucket",
};

export const CDN = {
  VIDEO_URL: (videoId: string) =>
    `${AWS_CONFIG.CLOUDFRONT_BASE_URL}/${videoId}`,
  THUMBNAIL_URL: (thumbnailId: string) =>
    `${AWS_CONFIG.CLOUDFRONT_BASE_URL}/${thumbnailId}`,
};

// Video Configuration
export const DEFAULT_VIDEO_CONFIG = {
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  frameRate: { ideal: 30 },
  aspectRatio: 16 / 9,
  facingMode: "user",
  processingProgress: 0,
  uploadUrl: (videoId: string) =>
    `${AWS_CONFIG.S3_BASE_URL}/${AWS_CONFIG.BUCKET_NAME}/${videoId}`,
  thumbnailUrl: (thumbnailId: string) =>
    `${AWS_CONFIG.S3_BASE_URL}/${AWS_CONFIG.BUCKET_NAME}/${thumbnailId}`,
};

// Video Recording Configuration
export const DEFAULT_RECORDING_CONFIG = {
  mimeType: "video/webm;codecs=vp9,opus",
  audioBitsPerSecond: 128000,
  videoBitsPerSecond: 2500000,
  width: 1920,
  height: 1080,
  frameRate: 30,
};

// Filter Options
export const filterOptions = ["Most Viewed", "Most Recent"];

export const visibilities: Visibility[] = ["public", "private"];

export const initialVideoState = {
  isLoaded: false,
  hasIncrementedView: false,
  isProcessing: false,
  processingProgress: 0,
  playbackRate: 1,
  isPip: false,
  isFullscreen: false,
};
