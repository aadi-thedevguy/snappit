import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import aj, { shield, slidingWindow } from "@/lib/arcjet";
import { auth } from "@/lib/auth";
import { db } from "@/drizzle/db";
import { videos } from "@/drizzle/schema";
import { createCloudFrontVideoUrl } from "@/lib/storage/videoStorage";
import {
  getProcessedVideoStorageKey,
  getRawVideoStorageKey,
  getVideoObjectKey,
  PROCESSED_VIDEO_CONTENT_TYPE,
} from "@snappit/video-storage/keys";

const rateLimit = aj
  .withRule(shield({ mode: "LIVE" }))
  .withRule(slidingWindow({ mode: "LIVE", interval: "1m", max: 30 }));
const uuid = z.uuid();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> },
) {
  try {
    const decision = await rateLimit.protect(request);
    if (decision.isDenied())
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const { videoId } = await params;
    if (!uuid.safeParse(videoId).success)
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    const [video] = await db.select().from(videos).where(eq(videos.id, videoId));
    if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });
    const session = await auth.api.getSession({ headers: await headers() });
    if (video.visibility !== "public" && video.userId !== session?.user.id) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }
    if (video.processingStatus === "uploading") {
      return NextResponse.json({ status: "processing" }, { status: 202 });
    }
    if (
      video.processingStatus === "ready" &&
      video.processedMimeType === PROCESSED_VIDEO_CONTENT_TYPE
    ) {
      const processedKey =
        video.processedVideoId ?? getProcessedVideoStorageKey(video.userId, video.id);
      return NextResponse.json({
        signedUrl: createCloudFrontVideoUrl(getVideoObjectKey(processedKey)),
        contentType: PROCESSED_VIDEO_CONTENT_TYPE,
      });
    }
    if (
      video.processingStatus === "failed" ||
      video.processingStatus === "uploaded" ||
      video.processingStatus === "processing"
    ) {
      const rawKey = video.rawVideoId ?? getRawVideoStorageKey(video.userId, video.id);
      return NextResponse.json({
        signedUrl: createCloudFrontVideoUrl(getVideoObjectKey(rawKey)),
        contentType: "video/webm",
      });
    }
    if (video.processingStatus !== "ready") {
      return NextResponse.json(
        { error: "This recording could not be processed." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "This recording could not be processed." }, { status: 409 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
