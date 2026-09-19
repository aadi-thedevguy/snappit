// Metadata Constants
export const SITE_URL = "https://snappit.adityakhare.com";
export const APP_TITLE = "Snappit - Record your Product Demos with ease";
export const APP_DESCRIPTION =
  "A powerful, screen recording platform so you can record and share your product demos and workflows seamlessly with anyone.";
export const DEFAULT_VIDEO_THUMBNAIL_URL = "/assets/images/thumbnail.png";
export const THUMBNAIL_URL = `${SITE_URL}/assets/images/thumbnail.png`;
export const FAVICON_URL = `${SITE_URL}/assets/icons/favicon.ico`;
export const APPLE_ICON_URL = `${SITE_URL}/assets/icons/apple-icon.png`;
export const MANIFEST_URL = `${SITE_URL}/assets/manifest.json`;

// Size Constants
export { MAX_VIDEO_SIZE } from "@snappit/validation";
export const MAX_THUMBNAIL_SIZE = 10 * 1024 * 1024; //10mb

export const DEFAULT_AVATAR_URL = "https://api.dicebear.com/9.x/avataaars-neutral/svg";

export const CDN = {
  VIDEO_URL: (storageKey: string) =>
    `https://d28vypb2sw9vap.cloudfront.net/${storageKey.split("/").map(encodeURIComponent).join("/")}`,
};

// Display-capture constraints (no camera-only keys like facingMode)
export const DEFAULT_VIDEO_CONFIG = {
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  frameRate: { ideal: 30 },
};

// Bitrate defaults; mimeType is chosen at runtime via buildMediaRecorderOptions
export const DEFAULT_RECORDING_CONFIG = {
  audioBitsPerSecond: 128000,
  videoBitsPerSecond: 2500000,
};
