import { createInngestClient, videoUploaded } from "@snappit/inngest";
import { createHandlers, type ProcessingServices } from "./handlers.js";

export function createTranscodeVideoToMp4(inngest: ReturnType<typeof createInngestClient>, services: ProcessingServices) {
  const handlers = createHandlers(services);
  return inngest.createFunction({
    id: "transcode-video-to-mp4",
    name: "Transcode video to MP4",
    triggers: [videoUploaded],
    idempotency: "event.data.videoId",
    singleton: { key: "event.data.videoId", mode: "skip" },
    concurrency: { limit: 2 },
    retries: 2,
    onFailure: handlers.failure,
  }, handlers.process);
}
