import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSignedUrl as getCFRSignedUrl } from "@aws-sdk/cloudfront-signer";
import { CDN } from "@/constants";
import { formatPrivateKey, getEnv } from "@/lib/utils";

export type VideoProcessingStatus = "uploaded" | "processing" | "ready" | "failed";

export const RAW_VIDEO_CONTENT_TYPE = "video/webm";
export const PROCESSED_VIDEO_CONTENT_TYPE = "video/mp4";

export const getRawVideoStorageKey = (videoId: string) => `raw/${videoId}.webm`;
export const getProcessedVideoStorageKey = (videoId: string) =>
  `processed/${videoId}.mp4`;

export const getVideoObjectKey = (storageKey: string) =>
  storageKey.startsWith("videos/") ? storageKey : `videos/${storageKey}`;

export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME ?? "";

export const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
  region: process.env.AWS_REGION ?? "us-east-1",
});

export async function createRawVideoUploadUrl(
  videoId: string,
  contentType: string = RAW_VIDEO_CONTENT_TYPE,
) {
  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: getVideoObjectKey(getRawVideoStorageKey(videoId)),
      ContentType: contentType,
    }),
    { expiresIn: 3600 },
  );
}

export function createCloudFrontVideoUrl(storageKey: string) {
  const keyPairId = getEnv("CLOUDFRONT_KEY_PAIR_ID");
  const rawKey = getEnv("CLOUDFRONT_PRIVATE_KEY");
  const privateKey = formatPrivateKey(rawKey);
  const url = CDN.VIDEO_URL(storageKey.replace(/^videos\//, ""));
  const expiry = new Date(Date.now() + 1000 * 60 * 60);

  return getCFRSignedUrl({
    url,
    keyPairId,
    privateKey,
    dateLessThan: expiry.toISOString(),
  });
}

export async function createProcessedVideoDownloadUrl(
  storageKey: string,
  title?: string,
) {
  const filename = title
    ? encodeURIComponent(`${title}.mp4`)
    : "snappit-video.mp4";

  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: getVideoObjectKey(storageKey),
      ResponseContentDisposition: `attachment; filename="${filename}"`,
      ResponseContentType: PROCESSED_VIDEO_CONTENT_TYPE,
    }),
    { expiresIn: 3600 },
  );
}
