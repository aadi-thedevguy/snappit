import { S3Client } from "@aws-sdk/client-s3";

export function createVideoStorage(config: {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}) {
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials:
      config.accessKeyId && config.secretAccessKey
        ? { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
        : undefined,
  });
  return { client, bucket: config.bucket, close: () => client.destroy() };
}
