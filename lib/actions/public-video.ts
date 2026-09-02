"use server";

import { getSignedUrl } from "@aws-sdk/cloudfront-signer";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { CDN } from "@/constants";
import { db } from "@/drizzle/db";
import { videos } from "@/drizzle/schema";
import aj, { request, shield, slidingWindow } from "@/lib/arcjet";
import { formatPrivateKey, getEnv } from "@/lib/utils";

const publicVideoIdSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9]{9}$/, "Invalid public video ID.");

const publicDownloadProtection = aj
  .withRule(shield({ mode: "LIVE" }))
  .withRule(
    slidingWindow({
      mode: "LIVE",
      interval: "1m",
      max: 10,
    }),
  );

const buildDownloadUrl = (videoId: string, title: string) => {
  const filename = `${title}.mp4`;
  const fallbackFilename =
    `${title.normalize("NFKD").replace(/[^\x20-\x7E]/g, "")}.mp4`
      .replace(/["\\\r\n]/g, "")
      .trim() || "snappit-video.mp4";
  const downloadUrl = new URL(CDN.VIDEO_URL(videoId));

  downloadUrl.searchParams.set(
    "response-content-disposition",
    `attachment; filename="${fallbackFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  );
  downloadUrl.searchParams.set("response-content-type", "video/mp4");

  return downloadUrl.toString();
};

export const generatePublicVideoDownloadUrl = async (publicVideoId: string) => {
  try {
    const validatedPublicVideoId = publicVideoIdSchema.parse(publicVideoId);
    const decision = await publicDownloadProtection.protect(await request());

    if (decision.isDenied()) {
      return {
        error: decision.reason.isRateLimit()
          ? "Too many download requests. Please try again later."
          : "This download request was blocked.",
      };
    }

    const [video] = await db
      .select({ videoId: videos.videoId, title: videos.title })
      .from(videos)
      .where(
        and(
          eq(videos.publicVideoId, validatedPublicVideoId),
          eq(videos.visibility, "public"),
        ),
      );

    if (!video) {
      return { error: "This public video is no longer available." };
    }

    const downloadUrl = getSignedUrl({
      url: buildDownloadUrl(video.videoId, video.title),
      keyPairId: getEnv("CLOUDFRONT_KEY_PAIR_ID"),
      privateKey: formatPrivateKey(getEnv("CLOUDFRONT_PRIVATE_KEY")),
      dateLessThan: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });

    return { data: { downloadUrl } };
  } catch (error) {
    console.error("Error generating public video download URL:", error);

    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }

    return { error: "Unable to prepare the download. Please try again." };
  }
};
