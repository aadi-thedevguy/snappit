import { serve } from "inngest/next";

export const runtime = "nodejs";
export const maxDuration = 200;

import { inngest } from "@/lib/inngest/client";
import { transcodeVideoToMp4 } from "@/lib/inngest/functions/transcodeVideo";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [transcodeVideoToMp4],
});
