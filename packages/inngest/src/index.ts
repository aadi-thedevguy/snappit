import { Inngest, eventType } from "inngest";
import { uploadedVideoEvent, type UploadedVideoEvent } from "@snappit/validation";

export type SnappitEvents = { "video/uploaded": { data: UploadedVideoEvent } };
// Inngest v4 uses eventType for typed triggers and event creation.
export const videoUploaded = eventType("video/uploaded", { schema: uploadedVideoEvent });

export function createInngestClient(options: {
  appId: string;
  appVersion?: string;
  eventKey?: string;
  signingKey?: string;
  isDev?: boolean;
  env?: string;
}) {
  const { appId, ...rest } = options;
  return new Inngest({ id: appId, ...rest });
}
