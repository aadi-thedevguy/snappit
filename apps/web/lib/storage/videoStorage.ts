import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSignedUrl as getCFRSignedUrl } from "@aws-sdk/cloudfront-signer";
import { CDN } from "@/constants";
import { formatPrivateKey, getEnv } from "@/lib/utils";

import "server-only";
import { createVideoStorage } from "@snappit/video-storage";
import { getRawVideoStorageKey, getVideoObjectKey, RAW_VIDEO_CONTENT_TYPE, PROCESSED_VIDEO_CONTENT_TYPE } from "@snappit/video-storage/keys";
export * from "@snappit/video-storage/keys";

export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME ?? "";
export const { client: s3 } = createVideoStorage({
  bucket: S3_BUCKET_NAME,
  region: process.env.AWS_REGION ?? "us-east-1",
  endpoint: process.env.S3_ENDPOINT || undefined,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
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
