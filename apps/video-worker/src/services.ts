import { createReadStream, createWriteStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { NonRetriableError } from "inngest";
import { createDb } from "@snappit/db";
import { createVideoStorage } from "@snappit/video-storage";
import { getVideoObjectKey, PROCESSED_VIDEO_CONTENT_TYPE } from "@snappit/video-storage/keys";
import { MAX_VIDEO_SIZE } from "@snappit/validation";
import type { WorkerConfig } from "./config.js";
import { createVideoRepository } from "./repository.js";
import { transcodeToMp4, withMediaDirectory } from "./media/ffmpeg.js";

export function createServices(config: WorkerConfig) {
  const database = createDb(config.DATABASE_URL, {
    max: config.DATABASE_POOL_SIZE,
    ssl: config.DATABASE_SSL === "disable" ? false : config.DATABASE_SSL,
  });
  const storage = createVideoStorage({ bucket: config.S3_BUCKET_NAME, region: config.AWS_REGION,
    endpoint: config.S3_ENDPOINT, accessKeyId: config.AWS_ACCESS_KEY_ID, secretAccessKey: config.AWS_SECRET_ACCESS_KEY });
  return {
    repository: createVideoRepository(database.db),
    render: createRenderer(config, storage),
    async close() { storage.close(); await database.close(); },
  };
}

export function createRenderer(config: WorkerConfig, storage: ReturnType<typeof createVideoStorage>, encode = transcodeToMp4) {
  return async (rawKey: string, processedKey: string) => {
      return withMediaDirectory(async directory => {
        const started = Date.now();
        const input = join(directory, "input");
        const output = join(directory, "output.mp4");
        const signal = AbortSignal.timeout(5 * 60_000);
        const object = await storage.client.send(new GetObjectCommand({ Bucket: storage.bucket, Key: getVideoObjectKey(rawKey) }), { abortSignal: signal });
        if (!object.Body) throw new Error("S3 object body was empty");
        const body = object.Body as Readable;
        if (!object.ContentLength || object.ContentLength > MAX_VIDEO_SIZE) {
          body.destroy();
          throw new NonRetriableError("Uploaded video must be between 1 byte and 500 MiB");
        }
        let received = 0;
        const limit = new Transform({ transform(chunk, _encoding, callback) {
          received += chunk.length;
          callback(received > MAX_VIDEO_SIZE ? new NonRetriableError("Uploaded video exceeds size limit") : null, chunk);
        } });
        await pipeline(body, limit, createWriteStream(input), { signal });
        await encode(input, output, config);
        const { size } = await stat(output);
        const outputStream = createReadStream(output);
        const upload = new Upload({ client: storage.client, params: {
          Bucket: storage.bucket, Key: getVideoObjectKey(processedKey), ContentType: PROCESSED_VIDEO_CONTENT_TYPE,
          ContentLength: size, Body: outputStream,
        }, queueSize: 2, partSize: 8 * 1024 * 1024, leavePartsOnError: false });
        const timer = setTimeout(() => { void upload.abort(); }, 5 * 60_000);
        try { await upload.done(); } finally { clearTimeout(timer); outputStream.destroy(); }
        return { storageKey: processedKey, renderTimeMs: Date.now() - started };
      }, config.MEDIA_TEMP_DIRECTORY);
    };
}
