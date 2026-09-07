"use server";

import { db } from "@/drizzle/db";
import { videos, user } from "@/drizzle/schema";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, desc, eq, sql } from "drizzle-orm";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@/lib/auth";
import {
  doesTitleMatch,
  formSchema,
  generatePublicVideoId,
  getOrderByClause,
} from "@/lib/utils";
import aj, { fixedWindow, request } from "../arcjet";
import z from "zod";
import { updateFormSchema } from "@/lib/utils";
import { inngest } from "@/lib/inngest/client";
import {
  createCloudFrontVideoUrl,
  createProcessedVideoDownloadUrl,
  createRawVideoUploadUrl,
  getProcessedVideoStorageKey,
  getRawVideoStorageKey,
  getVideoObjectKey,
  RAW_VIDEO_CONTENT_TYPE,
  S3_BUCKET_NAME,
  s3,
} from "@/lib/storage/videoStorage";

const validateWithArcjet = async (fingerPrint: string) => {
  const rateLimit = aj.withRule(
    fixedWindow({
      mode: "LIVE",
      window: "1m",
      max: 10,
      characteristics: ["fingerprint"],
    }),
  );
  const req = await request();
  const decision = await rateLimit.protect(req, { fingerprint: fingerPrint });
  if (decision.isDenied()) {
    throw new Error("Rate Limit Exceeded");
  }
};

// Helper functions with descriptive names
const revalidatePaths = (paths: string[]) => {
  paths.forEach((path) => revalidatePath(path));
};

const getSessionUserId = async (): Promise<string> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthenticated");
  return session.user.id;
};

const buildVideoWithUserQuery = () =>
  db
    .select({
      video: videos,
      user: { id: user.id, name: user.name, image: user.image },
    })
    .from(videos)
    .leftJoin(user, eq(videos.userId, user.id));

// Server Actions
export const getVideoUploadUrl = async (
  contentType: string = RAW_VIDEO_CONTENT_TYPE,
) => {
  try {
    await getSessionUserId();

    const timestamp = Date.now();
    const videoId = `video-${timestamp}`;

    const uploadUrl = await createRawVideoUploadUrl(videoId, contentType);

    return {
      data: {
        videoId,
        rawVideoId: getRawVideoStorageKey(videoId),
        uploadUrl,
      },
    };
  } catch (error) {
    console.error("Error getting video upload URL:", error);
    if (error instanceof Error && error.message === "Unauthenticated") {
      return { error: "You must be logged in to get a video upload URL." };
    }
    return { error: "An unexpected error occurred." };
  }
};

export const getThumbnailUploadUrl = async (videoId: string) => {
  try {
    // AWS S3 Implementation
    const thumbnailId = `thumbnail-${Date.now()}-${videoId}`;

    // Generate presigned URL using AWS SDK
    // Note: This requires AWS SDK configuration in the server
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: `thumbnails/${thumbnailId}`,
      }),
      {
        expiresIn: 3600,
      },
    );

    return { data: { uploadUrl, thumbnailId } };
  } catch (error) {
    console.error("Error getting thumbnail upload URL:", error);
    return { error: "An unexpected error occurred." };
  }
};

export const saveVideoDetails = async (videoDetails: VideoDetails) => {
  try {
    const userId = await getSessionUserId();
    await validateWithArcjet(userId);
    formSchema.parse(videoDetails);

    const now = new Date();
    let isUnique = false;
    let publicVideoId = "";

    while (!isUnique) {
      publicVideoId = generatePublicVideoId();

      const [result] = await db
        .select({ publicVideoId: videos.publicVideoId })
        .from(videos)
        .where(eq(videos.publicVideoId, publicVideoId));

      // If result is undefined, we didn't find a match, meaning it's unique!
      if (!result) {
        isUnique = true;
      }
    }

    await db
      .insert(videos)
      .values({
        videoId: videoDetails.videoId,
        rawVideoId:
          videoDetails.rawVideoId ?? getRawVideoStorageKey(videoDetails.videoId),
        rawMimeType: videoDetails.rawMimeType ?? RAW_VIDEO_CONTENT_TYPE,
        processedVideoId: null,
        processedMimeType: null,
        processingStatus: "uploaded",
        processingError: null,
        thumbnailId: videoDetails.thumbnailId,
        title: videoDetails.title,
        description: videoDetails.description,
        visibility: videoDetails.visibility,
        duration: videoDetails.duration,
        publicVideoId,
        userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await inngest.send({
      id: `${videoDetails.videoId}-uploaded`,
      name: "video/uploaded",
      data: { videoId: videoDetails.videoId },
    });

    revalidatePaths(["/"]);
    return { data: null };
  } catch (error) {
    console.error("Error saving video details:", error);
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    if (error instanceof Error) {
      if (error.message === "Unauthenticated") {
        return { error: "You must be logged in to save video details." };
      }
      if (error.message === "Rate Limit Exceeded") {
        return { error: "You are uploading too fast. Please try again later." };
      }
    }
    return { error: "An unexpected error occurred." };
  }
};

export const getVideoById = async (videoId: string) => {
  try {
    const [videoRecord] = await buildVideoWithUserQuery().where(
      eq(videos.videoId, videoId),
    );
    return { data: videoRecord };
  } catch (error) {
    console.error("Error getting video by id:", error);
    return { error: "An unexpected error occurred." };
  }
};

export const getVideoByPublicVideoId = async (publicVideoId: string) => {
  try {
    const [video] = await db
      .select({
        videoId: videos.videoId,
        publicVideoId: videos.publicVideoId,
        title: videos.title,
        description: videos.description,
        views: videos.views,
        duration: videos.duration,
        rawVideoId: videos.rawVideoId,
        processedVideoId: videos.processedVideoId,
        processedMimeType: videos.processedMimeType,
        processingStatus: videos.processingStatus,
        processingError: videos.processingError,
        createdAt: videos.createdAt,
        updatedAt: videos.updatedAt,
      })
      .from(videos)
      .where(
        and(
          eq(videos.publicVideoId, publicVideoId),
          eq(videos.visibility, "public"),
        ),
      );

    if (!video) return { data: { video: null } };

    return {
      data: {
        video,
      },
    };
  } catch (error) {
    console.error("Error getting video by public id:", error);
    return { error: "An unexpected error occurred." };
  }
};

export const incrementVideoViews = async (videoId: string) => {
  try {
    await validateWithArcjet(videoId);

    // Check if this is a public video ID
    const [video] = await db
      .select({ videoId: videos.videoId })
      .from(videos)
      .where(eq(videos.publicVideoId, videoId));

    // If not found, check if it's a regular video ID
    const actualVideoId = video?.videoId || videoId;

    await db
      .update(videos)
      .set({ views: sql`${videos.views} + 1`, updatedAt: new Date() })
      .where(eq(videos.videoId, actualVideoId));

    revalidatePaths([`/video/${actualVideoId}`, `/share/${videoId}`]);
    return { data: {} };
  } catch (error) {
    console.error("Error incrementing video views:", error);
    if (error instanceof Error && error.message === "Rate Limit Exceeded") {
      return { error: "Rate limit exceeded." };
    }
    return { error: "An unexpected error occurred." };
  }
};

export const getAllVideos = async (
  userIdParameter: string,
  searchQuery: string = "",
  sortFilter?: string,
  pageNumber: number = 1,
  pageSize: number = 8,
) => {
  try {
    const currentUserId = (
      await auth.api.getSession({ headers: await headers() })
    )?.user.id;
    const isOwner = userIdParameter === currentUserId;

    if (!isOwner) {
      return { error: "Unauthorized" };
    }

    const [userInfo] = await db
      .select({
        id: user.id,
        name: user.name,
        image: user.image,
        email: user.email,
      })
      .from(user)
      .where(eq(user.id, userIdParameter));
    if (!userInfo) return { error: "User not found" };

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const conditions = [
      eq(videos.userId, userIdParameter),
      searchQuery.trim() && doesTitleMatch(videos, searchQuery),
    ].filter(Boolean) as any[];

    const [{ totalCount }] = await db
      .select({ totalCount: sql<number>`count(*)` })
      .from(videos)
      .where(and(...conditions));

    const totalVideos = Number(totalCount || 0);
    const totalPages = Math.ceil(totalVideos / pageSize);

    const userVideos = await buildVideoWithUserQuery()
      .where(and(...conditions))
      .orderBy(
        sortFilter ? getOrderByClause(sortFilter) : desc(videos.createdAt),
      )
      .limit(pageSize)
      .offset((pageNumber - 1) * pageSize);

    return {
      data: {
        user: userInfo,
        videos: userVideos,
        count: userVideos.length,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalVideos,
          pageSize,
        },
      },
    };
  } catch (error) {
    console.error("Error getting all videos:", error);
    return { error: "An unexpected error occurred." };
  }
};

export const updateVideoVisibility = async (
  videoId: string,
  visibility: "public" | "private",
) => {
  try {
    const userId = await getSessionUserId();
    await validateWithArcjet(userId);

    const [existing] = await db
      .select({ publicVideoId: videos.publicVideoId })
      .from(videos)
      .where(and(eq(videos.videoId, videoId), eq(videos.userId, userId)));

    if (!existing) {
      return { error: "Video not found or unauthorized." };
    }

    const data = await db
      .update(videos)
      .set({
        visibility,
        updatedAt: new Date(),
      })
      .where(and(eq(videos.videoId, videoId), eq(videos.userId, userId)))
      .returning({
        visibility: videos.visibility,
        publicVideoId: videos.publicVideoId,
      });

    revalidatePaths(["/"]);

    return {
      data: {
        visibility: data[0].visibility,
        publicVideoId: data[0].publicVideoId,
      },
    };
  } catch (error) {
    console.error("Error updating video visibility:", error);
    if (error instanceof Error && error.message === "Unauthenticated") {
      return { error: "You must be logged in to update video visibility." };
    }
    if (error instanceof Error && error.message === "Rate Limit Exceeded") {
      return { error: "Rate limit exceeded." };
    }
    return { error: "An unexpected error occurred." };
  }
};

export const updateVideoDetails = async (videoDetails: {
  videoId: string;
  title: string;
  description: string;
  visibility: "public" | "private";
}) => {
  try {
    updateFormSchema.parse(videoDetails);

    const userId = await getSessionUserId();
    await validateWithArcjet(userId);

    const [existing] = await db
      .select({ publicVideoId: videos.publicVideoId })
      .from(videos)
      .where(
        and(
          eq(videos.videoId, videoDetails.videoId),
          eq(videos.userId, userId),
        ),
      );

    if (!existing) {
      return { error: "Video not found or unauthorized." };
    }

    const [updatedVideo] = await db
      .update(videos)
      .set({
        ...videoDetails,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(videos.videoId, videoDetails.videoId),
          eq(videos.userId, userId),
        ),
      )
      .returning();

    revalidatePaths(["/"]);
    return { data: updatedVideo };
  } catch (error) {
    console.error("Error updating video details:", error);
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    if (error instanceof Error) {
      if (error.message === "Unauthenticated") {
        return { error: "You must be logged in to update video details." };
      }
      if (error.message === "Rate Limit Exceeded") {
        return { error: "You are updating too fast. Please try again later." };
      }
    }
    return { error: "An unexpected error occurred." };
  }
};

export const deleteVideo = async (videoId: string, thumbnailId: string) => {
  try {
    // Delete raw video, processed video, and thumbnail from S3.
    await Promise.all([
      s3.send(
        new DeleteObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: getVideoObjectKey(getRawVideoStorageKey(videoId)),
        }),
      ),
      s3.send(
        new DeleteObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: getVideoObjectKey(getProcessedVideoStorageKey(videoId)),
        }),
      ),
      s3.send(
        new DeleteObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: `thumbnails/${thumbnailId}`,
        }),
      ),
    ]);

    // Delete from database
    await db.delete(videos).where(eq(videos.videoId, videoId));
    revalidatePaths(["/", `/video/${videoId}`]);
    return { data: {} };
  } catch (error) {
    console.error("Error deleting video:", error);
    return { error: "An unexpected error occurred." };
  }
};

export const getPlayableVideoStorageKey = (video: {
  videoId: string;
  rawVideoId?: string | null;
  processingStatus?: "uploaded" | "processing" | "ready" | "failed" | null;
  processedVideoId?: string | null;
}) => {
  if (video.processingStatus !== "ready") {
    return null;
  }

  // Legacy records were stored directly under videos/{videoId} before the
  // raw/processed split. Keep them playable while new uploads wait for MP4.
  if (!video.rawVideoId && !video.processedVideoId) {
    return video.videoId;
  }

  return video.processedVideoId ?? null;
};

export const generateSignedVideoUrl = async (storageKey: string) => {
  return createCloudFrontVideoUrl(storageKey);
};

export const generateDownloadSignedUrl = async (
  storageKey: string,
  title?: string,
) => {
  try {
    return await createProcessedVideoDownloadUrl(storageKey, title);
  } catch (error) {
    console.error("Error generating S3 download URL:", error);
    throw new Error("Failed to generate download URL");
  }
};
