import { NonRetriableError } from "inngest";
import { uploadedVideoEvent } from "@snappit/validation";
import { getProcessedVideoStorageKey, getRawVideoStorageKey } from "@snappit/video-storage/keys";

export type ClaimedVideo = {
  id: string;
  videoId: string;
  rawVideoId: string | null;
  processedVideoId: string | null;
  alreadyReady: boolean;
  runId: string;
};
export interface VideoRepository {
  claim(videoId: string, runId: string): Promise<ClaimedVideo | undefined>;
  ready(video: ClaimedVideo, key: string): Promise<boolean>;
  fail(videoId: string, runId: string): Promise<void>;
}
export interface Steps { run<T>(id: string, work: () => Promise<T>): Promise<T> }
export interface Log {
  info(message: string, context: Record<string, unknown>): void;
  error(message: string, context: Record<string, unknown>): void;
}
export interface ProcessingServices {
  repository: VideoRepository;
  render(rawKey: string, processedKey: string): Promise<{ storageKey: string; renderTimeMs: number }>;
}

export function createHandlers({ repository, render }: ProcessingServices) {
  return {
    async process({ event, step, logger, runId }: { event: { data: unknown }; step: Steps; logger: Log; runId: string }) {
      const parsed = uploadedVideoEvent.safeParse(event.data);
      if (!parsed.success) throw new NonRetriableError("Invalid video/uploaded event");
      const { videoId } = parsed.data;
      const video = await step.run("mark-processing", async () => {
        const claimed = await repository.claim(videoId, runId);
        if (!claimed) throw new NonRetriableError("Video was not found");
        return claimed;
      });
      if (video.alreadyReady) return { videoId, processedVideoId: video.processedVideoId };
      const rawKey = video.rawVideoId ?? getRawVideoStorageKey(videoId);
      const processedKey = getProcessedVideoStorageKey(videoId);
      logger.info("Processing uploaded video", { videoId });
      // All machine-local paths remain inside this one step, including cleanup.
      const rendered = await step.run("transcode-and-upload-mp4", () => render(rawKey, processedKey));
      const updated = await step.run("mark-ready", () => repository.ready(video, rendered.storageKey));
      logger.info("Video processing complete", { videoId, renderTimeMs: rendered.renderTimeMs, updated });
      return { videoId, processedVideoId: rendered.storageKey };
    },
    async failure({ event, step, logger }: { event: { data: { event: { data: unknown }; run_id: string } }; step: Steps; logger: Log }) {
      const parsed = uploadedVideoEvent.safeParse(event.data.event.data);
      if (!parsed.success) return;
      const { videoId } = parsed.data;
      logger.error("Video processing failed after retries", { videoId });
      await step.run("mark-video-processing-failed", () => repository.fail(videoId, event.data.run_id));
    },
  };
}
