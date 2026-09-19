import { z } from "zod";

export const uploadedVideoEvent = z.object({
  videoId: z.uuid(),
});
export type UploadedVideoEvent = z.infer<typeof uploadedVideoEvent>;
export const MAX_VIDEO_SIZE = 500 * 1024 * 1024;
