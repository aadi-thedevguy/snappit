import { z } from "zod";

export const uploadedVideoEvent = z.object({
  videoId: z.string().regex(/^[a-zA-Z0-9_-]+$/).max(200),
});
export type UploadedVideoEvent = z.infer<typeof uploadedVideoEvent>;
export const MAX_VIDEO_SIZE = 500 * 1024 * 1024;
