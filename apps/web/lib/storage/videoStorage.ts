import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSignedUrl as getCFRSignedUrl } from "@aws-sdk/cloudfront-signer";
import { CDN } from "@/constants";
import { formatPrivateKey, getEnv } from "@/lib/utils";

import "server-only";
import { createVideoStorage } from "@snappit/video-storage";
import { getVideoObjectKey } from "@snappit/video-storage/keys";
export * from "@snappit/video-storage/keys";

export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME ?? "";
export const { client: s3 } = createVideoStorage({
  bucket: S3_BUCKET_NAME,
  region: process.env.AWS_REGION ?? "us-east-1",
  endpoint: process.env.S3_ENDPOINT || undefined,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export function createCloudFrontVideoUrl(storageKey: string) {
  const keyPairId = getEnv("CLOUDFRONT_KEY_PAIR_ID");
  const rawKey = getEnv("CLOUDFRONT_PRIVATE_KEY");
  const privateKey = formatPrivateKey(rawKey);
  const url = CDN.VIDEO_URL(storageKey);
  const expiry = new Date(Date.now() + 1000 * 60 * 10);

  return getCFRSignedUrl({
    url,
    keyPairId,
    privateKey,
    dateLessThan: expiry.toISOString(),
  });
}

export async function createVideoDownloadUrl(
  storageKey: string,
  contentType: "video/mp4" | "video/webm",
  title?: string,
) {
  const extension = contentType === "video/mp4" ? "mp4" : "webm";
  const filename = title
    ? encodeURIComponent(`${title}.${extension}`)
    : `snappit-video.${extension}`;

  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: getVideoObjectKey(storageKey),
      ResponseContentDisposition: `attachment; filename="${filename}"`,
      ResponseContentType: contentType,
    }),
    { expiresIn: 600 },
  );
}
