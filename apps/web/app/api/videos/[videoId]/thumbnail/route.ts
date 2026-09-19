import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db } from "@/drizzle/db";
import { videos } from "@/drizzle/schema";
import { auth } from "@/lib/auth";
import { s3, S3_BUCKET_NAME } from "@/lib/storage/videoStorage";
import { getThumbnailStorageKey } from "@snappit/video-storage/keys";

const uuid = z.uuid();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await params;
  if (!uuid.safeParse(videoId).success) return new NextResponse(null, { status: 404 });
  const [video] = await db.select().from(videos).where(eq(videos.id, videoId));
  if (!video) return new NextResponse(null, { status: 404 });
  const session = await auth.api.getSession({ headers: await headers() });
  if (video.visibility !== "public" && video.userId !== session?.user.id)
    return new NextResponse(null, { status: 404 });
  const key = video.thumbnailId
    ? `thumbnails/${video.thumbnailId}`
    : getThumbnailStorageKey(video.userId, video.id);
  if (!key) return new NextResponse(null, { status: 404 });
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key }), {
    expiresIn: 300,
  });
  return NextResponse.redirect(url, {
    status: 302,
    headers: { "Cache-Control": "private, no-store" },
  });
}
