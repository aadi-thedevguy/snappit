import { and, eq } from "drizzle-orm";
import type { Database } from "@snappit/db";
import { videos } from "@snappit/db/schema";
import { PROCESSED_VIDEO_CONTENT_TYPE } from "@snappit/video-storage/keys";
import type { VideoRepository } from "./functions/handlers.js";
import { NonRetriableError } from "inngest";

export function createVideoRepository(db: Database): VideoRepository {
  return {
    async claim(videoId, runId) {
      return db.transaction(async (tx) => {
        const [existing] = await tx
          .select({
            id: videos.id,
            userId: videos.userId,
            processingStatus: videos.processingStatus,
            processedMimeType: videos.processedMimeType,
            processingRunId: videos.processingRunId,
          })
          .from(videos)
          .where(eq(videos.id, videoId))
          .for("update");

        if (!existing) return;

        /*
         * Check this BEFORE changing the status.
         *
         * An upload that hasn't been finalized must never be claimed
         * by the processing worker.
         */
        if (existing.processingStatus === "uploading") {
          throw new NonRetriableError("Recording upload is not finalized");
        }

        const alreadyReady =
          existing.processingStatus === "ready" &&
          existing.processedMimeType === PROCESSED_VIDEO_CONTENT_TYPE;

        /*
         * Prevent another Inngest run from taking ownership of a video
         * that is currently being processed.
         */
        if (
          !alreadyReady &&
          existing.processingStatus === "processing" &&
          existing.processingRunId &&
          existing.processingRunId !== runId
        ) {
          throw new NonRetriableError("Video is owned by another processing run");
        }

        if (!alreadyReady) {
          await tx
            .update(videos)
            .set({
              processingStatus: "processing",
              processingError: null,
              processingRunId: runId,
              updatedAt: new Date(),
            })
            .where(eq(videos.id, existing.id));
        }

        return {
          id: existing.id,
          userId: existing.userId,
          processingStatus: alreadyReady ? existing.processingStatus : "processing",
          alreadyReady,
          runId,
        };
      });
    },

    async ready(video) {
      const updated = await db
        .update(videos)
        .set({
          processedMimeType: PROCESSED_VIDEO_CONTENT_TYPE,
          processingStatus: "ready",
          processingError: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(videos.id, video.id),
            eq(videos.processingStatus, "processing"),
            eq(videos.processingRunId, video.runId),
          ),
        )
        .returning({
          id: videos.id,
        });

      return updated.length > 0;
    },

    async fail(videoId, runId) {
      // A late failure must never replace a completed or newly queued upload.
      await db
        .update(videos)
        .set({
          processingStatus: "failed",
          processingError: "Video processing failed. Please upload the video again.",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(videos.id, videoId),
            eq(videos.processingStatus, "processing"),
            eq(videos.processingRunId, runId),
          ),
        );
    },
  };
}
