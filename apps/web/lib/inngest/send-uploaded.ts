import { uploadedVideoEvent } from "@snappit/validation";
import { videoUploaded } from "@snappit/inngest";

export async function sendVideoUploaded(
  videoId: string,
  send: (event: ReturnType<typeof videoUploaded.create>) => Promise<unknown>,
) {
  const data = uploadedVideoEvent.parse({ videoId });
  return send(videoUploaded.create(data, { id: `${videoId}-uploaded` }));
}
