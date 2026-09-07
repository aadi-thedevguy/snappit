import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { eq } from "drizzle-orm";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

import { db } from "@/drizzle/db";
import { videos } from "@/drizzle/schema";
import { inngest } from "@/lib/inngest/client";
import {
  getProcessedVideoStorageKey,
  getRawVideoStorageKey,
  getVideoObjectKey,
  PROCESSED_VIDEO_CONTENT_TYPE,
  S3_BUCKET_NAME,
  s3,
} from "@/lib/storage/videoStorage";

type VideoUploadedEventData = { videoId: string };
type FailedVideoRunEventData = {
  event?: { data?: Partial<VideoUploadedEventData> };
};

const getWorkDir = (videoId: string) => join("/tmp", "snappit", videoId);

const markVideoFailed = async (videoId: string, errorMessage: string) => {
  await db
    .update(videos)
    .set({
      processingStatus: "failed",
      processingError: errorMessage,
      updatedAt: new Date(),
    })
    .where(eq(videos.videoId, videoId));
};

const streamBodyToFile = async (body: unknown, path: string) => {
  if (!body) throw new Error("S3 object body was empty");

  await mkdir(dirname(path), { recursive: true });

  if (body instanceof Readable) {
    await pipeline(body, createWriteStream(path));
    return;
  }

  if (body instanceof Blob) {
    await pipeline(
      Readable.fromWeb(body.stream() as never),
      createWriteStream(path),
    );
    return;
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "transformToWebStream" in body
  ) {
    const webStream = (
      body as { transformToWebStream: () => ReadableStream }
    ).transformToWebStream();
    await pipeline(Readable.fromWeb(webStream as never), createWriteStream(path));
    return;
  }

  throw new Error("Unsupported S3 object body type");
};

const runFfmpeg = (inputPath: string, outputPath: string) =>
  new Promise<void>((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg binary was not found"));
      return;
    }

    const ffmpeg = spawn(ffmpegPath, [
      "-y",
      "-i",
      inputPath,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outputPath,
    ]);

    let stderr = "";
    ffmpeg.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    ffmpeg.on("error", reject);
    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-4000)}`),
      );
    });
  });

export const transcodeVideoToMp4 = inngest.createFunction(
  {
    id: "transcode-video-to-mp4",
    name: "Transcode video to MP4",
    triggers: [{ event: "video/uploaded" }],
    idempotency: "event.data.videoId",
    singleton: { key: "event.data.videoId", mode: "cancel" },
    concurrency: { limit: 2 },
    retries: 2,
    timeouts: { finish: "15m" },
    cancelOn: [{ event: "video/uploaded", match: "data.videoId" }],
    onFailure: async ({ event, step }) => {
      const failureData = event.data as FailedVideoRunEventData;
      const videoId = failureData.event?.data?.videoId;
      if (!videoId) return;

      await step.run("mark-video-processing-failed", async () => {
        await markVideoFailed(videoId, "Video transcoding failed after retries.");
      });

      await step.run("cleanup-failed-transcode-files", async () => {
        await rm(getWorkDir(videoId), { recursive: true, force: true });
      });
    },
  },
  async ({ event, step, attempt, logger }) => {
    const { videoId } = event.data as VideoUploadedEventData;
    const rawStorageKey = getRawVideoStorageKey(videoId);
    const processedStorageKey = getProcessedVideoStorageKey(videoId);
    const workDir = getWorkDir(videoId);
    const inputPath = join(workDir, `input-attempt-${attempt}.webm`);
    const outputPath = join(workDir, `output-attempt-${attempt}.mp4`);

    const video = await step.run("mark-processing", async () => {
      const [updatedVideo] = await db
        .update(videos)
        .set({
          processingStatus: "processing",
          processingError: null,
          updatedAt: new Date(),
        })
        .where(eq(videos.videoId, videoId))
        .returning();

      if (!updatedVideo) throw new Error(`Video ${videoId} was not found`);
      return updatedVideo;
    });

    logger.info("Starting video transcode", {
      videoId,
      attempt,
      rawStorageKey,
      processedStorageKey,
      duration: video.duration,
    });

    try {
      await step.run("download-raw-webm", async () => {
        const object = await s3.send(
          new GetObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: getVideoObjectKey(rawStorageKey),
          }),
        );
        await streamBodyToFile(object.Body, inputPath);
      });

      await step.run("transcode-webm-to-seekable-mp4", async () => {
        await runFfmpeg(inputPath, outputPath);
      });

      await step.run("upload-processed-mp4", async () => {
        await s3.send(
          new PutObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: getVideoObjectKey(processedStorageKey),
            ContentType: PROCESSED_VIDEO_CONTENT_TYPE,
            Body: createReadStream(outputPath),
          }),
        );
      });

      await step.run("mark-ready", async () => {
        await db
          .update(videos)
          .set({
            processedVideoId: processedStorageKey,
            processedMimeType: PROCESSED_VIDEO_CONTENT_TYPE,
            processingStatus: "ready",
            processingError: null,
            updatedAt: new Date(),
          })
          .where(eq(videos.videoId, videoId));
      });
    } finally {
      await step.run("cleanup-temp-files", async () => {
        await rm(workDir, { recursive: true, force: true });
      });
    }

    return { videoId, processedVideoId: processedStorageKey };
  },
);
