import { createReadStream, createWriteStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { and, eq, ne } from "drizzle-orm";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { NonRetriableError } from "inngest";
import { z } from "zod";
import { MAX_VIDEO_SIZE } from "@/constants";

import { db } from "@/drizzle/db";
import { videos } from "@/drizzle/schema";
import { inngest } from "@/lib/inngest/client";
import {
  transcodeToMp4,
  withMediaDirectory,
} from "@/lib/inngest/media";
import {
  getProcessedVideoStorageKey,
  getRawVideoStorageKey,
  getVideoObjectKey,
  PROCESSED_VIDEO_CONTENT_TYPE,
  S3_BUCKET_NAME,
  s3,
} from "@/lib/storage/videoStorage";

const uploadedEvent = z.object({
  videoId: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/)
    .max(200),
});
async function downloadObject(
  key: string,
  path: string,
  validateInput = false,
) {
  const object = await s3.send(
    new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key }),
  );
  if (!object.Body) throw new Error("S3 object body was empty");
  const body = object.Body as Readable;
  if (
    validateInput &&
    (!object.ContentLength || object.ContentLength > MAX_VIDEO_SIZE)
  ) {
    body.destroy();
    throw new NonRetriableError(
      "Uploaded video must be between 1 byte and 500 MiB",
    );
  }
  await pipeline(body, createWriteStream(path));
}

async function uploadObject(key: string, path: string, contentType: string) {
  const { size } = await stat(path);
  await new Upload({
    client: s3,
    params: {
      Bucket: S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
      Body: createReadStream(path),
    },
    queueSize: 2,
    partSize: 8 * 1024 * 1024,
    leavePartsOnError: false,
  }).done();
}

export const transcodeVideoToMp4 = inngest.createFunction(
  {
    id: "transcode-video-to-mp4",
    name: "Transcode video to MP4",
    triggers: [{ event: "video/uploaded" }],
    idempotency: "event.data.videoId",
    // Duplicate upload notifications must not cancel a healthy render.
    singleton: { key: "event.data.videoId", mode: "skip" },
    concurrency: { limit: 2 },
    retries: 2,
    onFailure: async ({ event, step, error, logger }) => {
      const parsed = uploadedEvent.safeParse(event.data.event.data);
      if (!parsed.success) return;
      const { videoId } = parsed.data;
      logger.error("Video processing failed after retries", { videoId, error });
      await step.run("mark-video-processing-failed", async () => {
        await db
          .update(videos)
          .set({
            processingStatus: "failed",
            processingError:
              "Video processing failed. Please upload the video again.",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(videos.videoId, videoId),
              ne(videos.processingStatus, "ready"),
            ),
          );
      });
    },
  },
  async ({ event, step, logger }) => {
    const parsed = uploadedEvent.safeParse(event.data);
    if (!parsed.success)
      throw new NonRetriableError("Invalid video/uploaded event");
    const { videoId } = parsed.data;
    const video = await step.run("mark-processing", async () => {
      const [existing] = await db
        .select()
        .from(videos)
        .where(eq(videos.videoId, videoId));
      if (!existing)
        throw new NonRetriableError(`Video ${videoId} was not found`);
      if (existing.processingStatus === "ready" && existing.processedVideoId) {
        return { ...existing, alreadyReady: true };
      }
      await db
        .update(videos)
        .set({
          processingStatus: "processing",
          processingError: null,
          updatedAt: new Date(),
        })
        .where(eq(videos.id, existing.id));
      return { ...existing, alreadyReady: false };
    });
    if (video.alreadyReady)
      return { videoId, processedVideoId: video.processedVideoId };

    const rawStorageKey = video.rawVideoId ?? getRawVideoStorageKey(videoId);
    const processedStorageKey = getProcessedVideoStorageKey(videoId);
    logger.info("Processing uploaded video", {
      videoId,
      rawStorageKey,
      processedStorageKey,
    });

    // Download, encode, upload and cleanup must all execute on the same machine.
    // Only the durable S3 key crosses the step boundary.
    const rendered = await step.run("transcode-and-upload-mp4", () =>
      withMediaDirectory(async (directory) => {
        const started = Date.now();
        const input = join(directory, "input");
        const output = join(directory, "output.mp4");
        await downloadObject(getVideoObjectKey(rawStorageKey), input, true);
        await transcodeToMp4(input, output);
        await uploadObject(
          getVideoObjectKey(processedStorageKey),
          output,
          PROCESSED_VIDEO_CONTENT_TYPE,
        );
        return {
          storageKey: processedStorageKey,
          renderTimeMs: Date.now() - started,
        };
      }),
    );

    await step.run("mark-ready", async () => {
      await db
        .update(videos)
        .set({
          processedVideoId: rendered.storageKey,
          processedMimeType: PROCESSED_VIDEO_CONTENT_TYPE,
          processingStatus: "ready",
          processingError: null,
          updatedAt: new Date(),
        })
        .where(eq(videos.id, video.id));
    });
    logger.info("Video processing complete", {
      videoId,
      renderTimeMs: rendered.renderTimeMs,
    });
    return { videoId, processedVideoId: rendered.storageKey };
  },
);
