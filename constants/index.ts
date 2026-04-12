// Metadata Constants
export const SITE_URL = "https://snappit.adityakhare.com";
export const APP_TITLE = "Snappit";
export const APP_DESCRIPTION =
  "A powerful, full-stack screen recording and video hosting platform. Record and share seamlessly.";
export const THUMBNAIL_URL = `${SITE_URL}/assets/images/thumbnail.png`;
export const FAVICON_URL = `${SITE_URL}/assets/icons/favicon.ico`;
export const APPLE_ICON_URL = `${SITE_URL}/assets/icons/apple-icon.png`;
export const MANIFEST_URL = `${SITE_URL}/assets/manifest.json`;

// Size Constants
export const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500mb
export const MAX_THUMBNAIL_SIZE = 10 * 1024 * 1024; //10mb

export const DEFAULT_AVATAR_URL =
  "https://api.dicebear.com/9.x/avataaars-neutral/svg";

export const CDN = {
  VIDEO_URL: (videoId: string) =>
    `https://d28vypb2sw9vap.cloudfront.net/${videoId}`,
  THUMBNAIL_URL: (thumbnailId: string) =>
    `https://d28vypb2sw9vap.cloudfront.net/${thumbnailId}`,
};

// Video Configuration
export const DEFAULT_VIDEO_CONFIG = {
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  frameRate: { ideal: 30 },
  aspectRatio: 16 / 9,
  facingMode: "user",
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
