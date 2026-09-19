"use server";

import { MAX_THUMBNAIL_SIZE } from "@/constants";

import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { insertWithPublicVideoId } from "@/lib/utils";

import { db } from "@/drizzle/db";
import { videos, user } from "@/drizzle/schema";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, desc, eq, gte, lt, or, sql } from "drizzle-orm";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@/lib/auth";
import { doesTitleMatch, formSchema, getOrderByClause } from "@/lib/utils";
import aj, { fixedWindow, request } from "../arcjet";
import z from "zod";
import { updateFormSchema } from "@/lib/utils";
import { sendVideoUploaded } from "@/lib/inngest/send-uploaded";
import { MAX_VIDEO_SIZE } from "@snappit/validation";
import { inngest } from "@/lib/inngest/client";
import {
  createCloudFrontVideoUrl,
  createVideoDownloadUrl,
  getProcessedVideoStorageKey,
  getRawVideoStorageKey,
  getThumbnailStorageKey,
  getVideoObjectKey,
  PROCESSED_VIDEO_CONTENT_TYPE,
  RAW_VIDEO_CONTENT_TYPE,
  THUMBNAIL_CONTENT_TYPE,
  S3_BUCKET_NAME,
  s3,
} from "@/lib/storage/videoStorage";

const beginSchema = formSchema.extend({ videoId: z.uuid().optional() });
const finalizeSchema = formSchema.extend({ videoId: z.uuid() });
const uuidSchema = z.uuid();

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
  const ipLimit = aj.withRule(fixedWindow({ mode: "LIVE", window: "1m", max: 20 }));
  const ipDecision = await ipLimit.protect(req);
  if (ipDecision.isDenied()) throw new Error("IP Rate Limit Exceeded");
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

async function createAuthorizedThumbnailUrl(record: { id: string }) {
  return `/api/videos/${record.id}/thumbnail`;
}

// Create or resume an owned pending row before issuing expiring upload URLs.
export const beginRecordingUpload = async (input: unknown) => {
  try {
    const userId = await getSessionUserId();
    await validateWithArcjet(userId);
    const { videoId: pendingVideoId, ...values } = beginSchema.parse(input);
    const now = new Date();
    const abandonedBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const abandoned = await db
      .select({
        id: videos.id,
      })
      .from(videos)
      .where(
        and(
          eq(videos.userId, userId),
          eq(videos.processingStatus, "uploading"),
          lt(videos.createdAt, abandonedBefore),
        ),
      );
    for (const row of abandoned) {
      const rawStorageKey = getRawVideoStorageKey(userId, row.id);
      const thumbnailStorageKey = getThumbnailStorageKey(userId, row.id);
      const cleanupResults = await Promise.allSettled([
        s3.send(
          new DeleteObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: rawStorageKey,
          }),
        ),
        s3.send(
          new DeleteObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: thumbnailStorageKey,
          }),
        ),
      ]);
      for (const result of cleanupResults) {
        if (result.status === "rejected") {
          console.error(
            "Error deleting abandoned recording media:",
            { videoId: row.id },
            result.reason,
          );
        }
      }
      await db
        .delete(videos)
        .where(
          and(
            eq(videos.id, row.id),
            eq(videos.userId, userId),
            eq(videos.processingStatus, "uploading"),
          ),
        );
    }
    const videoId = await db.transaction(async (tx) => {
      // Serialize quota checks for one owner to prevent concurrent URL requests from racing.
      await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for("update");
      if (pendingVideoId) {
        const [pending] = await tx
          .select({ id: videos.id })
          .from(videos)
          .where(
            and(
              eq(videos.id, pendingVideoId),
              eq(videos.userId, userId),
              eq(videos.processingStatus, "uploading"),
            ),
          );
        if (!pending) throw new Error("Recording not found or upload is no longer pending.");
        return pending.id;
      }
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);
      const [active] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(videos)
        .where(and(eq(videos.userId, userId), eq(videos.processingStatus, "uploading")));
      const [daily] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(videos)
        .where(and(eq(videos.userId, userId), gte(videos.createdAt, dayStart)));
      const [bytes] = await tx
        .select({ total: sql<number>`coalesce(sum(${videos.rawSize}), 0)` })
        .from(videos)
        .where(and(eq(videos.userId, userId), gte(videos.createdAt, dayStart)));
      if (Number(active?.count ?? 0) >= 3) throw new Error("Too many active uploads");
      if (Number(daily?.count ?? 0) >= 20 || Number(bytes?.total ?? 0) >= 5 * 1024 * 1024 * 1024) {
        throw new Error("Daily upload quota reached");
      }

      const record = await insertWithPublicVideoId(async (publicVideoId) => {
        const [inserted] = await tx
          .insert(videos)
          .values({
            title: values.title,
            description: values.description,
            visibility: values.visibility,
            duration: values.duration,
            publicVideoId,
            userId,
            rawMimeType: RAW_VIDEO_CONTENT_TYPE,
            processedMimeType: null,
            processingStatus: "uploading",
          })
          .onConflictDoNothing({ target: videos.publicVideoId })
          .returning({ id: videos.id });
        return inserted;
      });
      return record.id;
    });

    const rawStorageKey = getRawVideoStorageKey(userId, videoId);
    const thumbnailStorageKey = getThumbnailStorageKey(userId, videoId);

    const [rawUploadUrl, thumbnailUploadUrl] = await Promise.all([
      getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: getVideoObjectKey(rawStorageKey),
          ContentType: RAW_VIDEO_CONTENT_TYPE,
        }),
        { expiresIn: 300 },
      ),
      getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: thumbnailStorageKey,
          ContentType: THUMBNAIL_CONTENT_TYPE,
        }),
        { expiresIn: 300 },
      ),
    ]);
    return { data: { videoId, rawUploadUrl, thumbnailUploadUrl } };
  } catch (error) {
    console.error("Error beginning recording upload:", error);
    if (error instanceof z.ZodError) return { error: error.issues[0].message };
    if (error instanceof Error && error.message === "Unauthenticated")
      return { error: "You must be logged in to upload a recording." };
    if (
      error instanceof Error &&
      error.message === "Recording not found or upload is no longer pending."
    )
      return { error: error.message };
    if (error instanceof Error && /Rate Limit|quota|active uploads/i.test(error.message))
      return {
        error: "Upload limit reached. Please wait before starting another recording.",
      };
    return { error: "An unexpected error occurred." };
  }
};

export const finalizeRecordingUpload = async (input: unknown) => {
  try {
    const userId = await getSessionUserId();
    await validateWithArcjet(userId);
    const { videoId, ...values } = finalizeSchema.parse(input);
    const [record] = await db
      .select()
      .from(videos)
      .where(
        and(
          eq(videos.id, videoId),
          eq(videos.userId, userId),
          eq(videos.processingStatus, "uploading"),
        ),
      );
    if (!record) {
      console.error("Cannot finalize recording: owned pending upload not found.", { videoId });
      return { error: "Recording not found or upload is no longer pending." };
    }
    const rawStorageKey = getRawVideoStorageKey(userId, videoId);
    const thumbnailStorageKey = getThumbnailStorageKey(userId, videoId);
    const [raw, thumbnail] = await Promise.all([
      s3.send(
        new HeadObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: getVideoObjectKey(rawStorageKey),
        }),
      ),
      s3.send(
        new HeadObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: thumbnailStorageKey,
        }),
      ),
    ]);
    if (
      !raw.ContentLength ||
      raw.ContentLength > MAX_VIDEO_SIZE ||
      raw.ContentType?.split(";")[0] !== RAW_VIDEO_CONTENT_TYPE
    ) {
      throw new Error("Recording is missing, invalid, or exceeds the size limit");
    }
    if (
      !thumbnail.ContentLength ||
      thumbnail.ContentLength > MAX_THUMBNAIL_SIZE ||
      thumbnail.ContentType?.split(";")[0] !== THUMBNAIL_CONTENT_TYPE
    ) {
      throw new Error("Recording thumbnail is missing, invalid, or exceeds the size limit");
    }
    const updated = await db.transaction(async (tx) => {
      await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for("update");
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const [bytes] = await tx
        .select({ total: sql<number>`coalesce(sum(${videos.rawSize}), 0)` })
        .from(videos)
        .where(and(eq(videos.userId, userId), gte(videos.createdAt, dayStart)));
      if (Number(bytes?.total ?? 0) + raw.ContentLength! > 5 * 1024 * 1024 * 1024) {
        throw new Error("Daily upload byte quota reached");
      }
      const [ownedPending] = await tx
        .select({ id: videos.id })
        .from(videos)
        .where(
          and(
            eq(videos.id, videoId),
            eq(videos.userId, userId),
            eq(videos.processingStatus, "uploading"),
          ),
        );
      if (!ownedPending) return false;
      const [updatedRow] = await tx
        .update(videos)
        .set({
          ...values,
          rawMimeType: RAW_VIDEO_CONTENT_TYPE,
          rawSize: raw.ContentLength,
          processingStatus: "uploaded",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(videos.id, videoId),
            eq(videos.userId, userId),
            eq(videos.processingStatus, "uploading"),
          ),
        )
        .returning({ id: videos.id });
      return !!updatedRow;
    });
    if (!updated) {
      console.error("Cannot finalize recording: pending row changed before finalization.", {
        videoId,
      });
      return { error: "Recording upload could not be finalized." };
    }
    await sendVideoUploaded(videoId, (event) => inngest.send(event));
    revalidatePaths(["/"]);
    return { data: { videoId } };
  } catch (error) {
    console.error("Error finalizing recording upload:", error);
    if (error instanceof z.ZodError) return { error: error.issues[0].message };
    if (error instanceof Error && error.message === "Unauthenticated")
      return { error: "You must be logged in to finalize this recording." };
    if (error instanceof Error && error.message.includes("Rate Limit"))
      return { error: "You are uploading too fast. Please try again later." };
    return { error: "The recording could not be verified. Please try again." };
  }
};

export const getVideoById = async (videoId: string) => {
  try {
    uuidSchema.parse(videoId);
    const userId = await getSessionUserId();
    const [videoRecord] = await db
      .select({
        video: {
          id: videos.id,
          title: videos.title,
          description: videos.description,
          views: videos.views,
          duration: videos.duration,
          processingStatus: videos.processingStatus,
          processingError: videos.processingError,
          processedMimeType: videos.processedMimeType,
          visibility: videos.visibility,
          publicVideoId: videos.publicVideoId,
          createdAt: videos.createdAt,
        },
        user: { id: user.id, name: user.name, image: user.image },
      })
      .from(videos)
      .leftJoin(user, eq(videos.userId, user.id))
      .where(and(eq(videos.id, videoId), eq(videos.userId, userId)));
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
        videoId: videos.id,
        title: videos.title,
        description: videos.description,
        views: videos.views,
        duration: videos.duration,
        processedMimeType: videos.processedMimeType,
        processingStatus: videos.processingStatus,
        createdAt: videos.createdAt,
      })
      .from(videos)
      .where(and(eq(videos.publicVideoId, publicVideoId), eq(videos.visibility, "public")));

    if (!video) return { data: { video: null } };

    return {
      data: {
        video: {
          videoId: video.videoId,
          title: video.title,
          description: video.description,
          views: video.views,
          duration: video.duration,
          processedMimeType: video.processedMimeType,
          processingStatus: video.processingStatus,
          createdAt: video.createdAt,
        },
      },
    };
  } catch (error) {
    console.error("Error getting video by public id:", error);
    return { error: "An unexpected error occurred." };
  }
};

export const incrementVideoViews = async (videoId: string) => {
  try {
    uuidSchema.parse(videoId);
    await validateWithArcjet(videoId);

    const [video] = await db
      .update(videos)
      .set({ views: sql`${videos.views} + 1`, updatedAt: new Date() })
      .where(and(eq(videos.id, videoId), eq(videos.visibility, "public")))
      .returning({ publicVideoId: videos.publicVideoId });

    revalidatePaths([`/video/${videoId}`, ...(video ? [`/share/${video.publicVideoId}`] : [])]);
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
    const currentUserId = (await auth.api.getSession({ headers: await headers() }))?.user.id;
    const isOwner = userIdParameter === currentUserId;

    if (!isOwner) {
      console.error("Cannot list videos: requested owner does not match the authenticated user.");
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
    if (!userInfo) {
      console.error("Cannot list videos: authenticated user record not found.");
      return { error: "User not found" };
    }

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
      .orderBy(sortFilter ? getOrderByClause(sortFilter) : desc(videos.createdAt))
      .limit(pageSize)
      .offset((pageNumber - 1) * pageSize);

    const safeVideos = await Promise.all(
      userVideos.map(async ({ video: row, user: owner }) => ({
        video: {
          id: row.id,
          publicVideoId: row.publicVideoId,
          title: row.title,
          description: row.description,
          visibility: row.visibility,
          views: row.views,
          duration: row.duration,
          processingStatus: row.processingStatus,
          processingError: row.processingError,
          processedMimeType: row.processedMimeType,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          userId: row.userId,
          thumbnailUrl: await createAuthorizedThumbnailUrl(row),
        },
        user: owner,
      })),
    );

    return {
      data: {
        user: userInfo,
        videos: safeVideos,
        count: safeVideos.length,
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

export const updateVideoVisibility = async (videoId: string, visibility: "public" | "private") => {
  try {
    const userId = await getSessionUserId();
    await validateWithArcjet(userId);
    uuidSchema.parse(videoId);

    const [existing] = await db
      .select({ publicVideoId: videos.publicVideoId })
      .from(videos)
      .where(and(eq(videos.id, videoId), eq(videos.userId, userId)));

    if (!existing) {
      console.error("Cannot update video visibility: owned video not found.", { videoId });
      return { error: "Video not found or unauthorized." };
    }

    const data = await db
      .update(videos)
      .set({
        visibility,
        updatedAt: new Date(),
      })
      .where(and(eq(videos.id, videoId), eq(videos.userId, userId)))
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
      .where(and(eq(videos.id, videoDetails.videoId), eq(videos.userId, userId)));

    if (!existing) {
      console.error("Cannot update video details: owned video not found.", {
        videoId: videoDetails.videoId,
      });
      return { error: "Video not found or unauthorized." };
    }

    const [updatedVideo] = await db
      .update(videos)
      .set({
        title: videoDetails.title,
        description: videoDetails.description,
        visibility: videoDetails.visibility,
        updatedAt: new Date(),
      })
      .where(and(eq(videos.id, videoDetails.videoId), eq(videos.userId, userId)))
      .returning({
        id: videos.id,
        title: videos.title,
        description: videos.description,
        visibility: videos.visibility,
        updatedAt: videos.updatedAt,
      });

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

export const deleteVideo = async (videoId: string) => {
  try {
    const userId = await getSessionUserId();
    uuidSchema.parse(videoId);
    const [video] = await db
      .select()
      .from(videos)
      .where(and(eq(videos.id, videoId), eq(videos.userId, userId)));
    if (!video) {
      console.error("Cannot delete video: owned video not found.", { videoId });
      return { error: "Video not found or unauthorized." };
    }
    const storageKeys = [
      getRawVideoStorageKey(video.userId, video.id),
      getProcessedVideoStorageKey(video.userId, video.id),
      getThumbnailStorageKey(video.userId, video.id),
    ];
    await Promise.all(
      storageKeys.map((key) =>
        s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key })),
      ),
    );

    // Delete from database
    await db.delete(videos).where(and(eq(videos.id, videoId), eq(videos.userId, userId)));
    revalidatePaths(["/", `/video/${videoId}`]);
    return { data: {} };
  } catch (error) {
    console.error("Error deleting video:", error);
    return { error: "An unexpected error occurred." };
  }
};

export const generatePlaybackUrl = async (videoId: string) => {
  try {
    uuidSchema.parse(videoId);
    const session = await auth.api.getSession({ headers: await headers() });
    const access = session?.user.id
      ? or(eq(videos.visibility, "public"), eq(videos.userId, session.user.id))
      : eq(videos.visibility, "public");
    const [video] = await db
      .select()
      .from(videos)
      .where(and(eq(videos.id, videoId), access));
    if (!video || video.processingStatus === "uploading") return null;
    if (
      video.processingStatus === "ready" &&
      video.processedMimeType === PROCESSED_VIDEO_CONTENT_TYPE
    ) {
      const storageKey = getProcessedVideoStorageKey(video.userId, video.id);
      if (storageKey) return createCloudFrontVideoUrl(getVideoObjectKey(storageKey));
    }
    const rawKey = getRawVideoStorageKey(video.userId, video.id);
    return createCloudFrontVideoUrl(getVideoObjectKey(rawKey));
  } catch (error) {
    console.error("Error generating playback URL:", error);
    return null;
  }
};

export const generateDownloadSignedUrl = async (videoId: string) => {
  try {
    uuidSchema.parse(videoId);
    const session = await auth.api.getSession({ headers: await headers() });
    const access = session?.user.id
      ? or(eq(videos.visibility, "public"), eq(videos.userId, session.user.id))
      : eq(videos.visibility, "public");
    const [video] = await db
      .select()
      .from(videos)
      .where(and(eq(videos.id, videoId), access));
    if (!video) throw new Error("Video not found");
    if (
      video.processingStatus === "ready" &&
      video.processedMimeType === PROCESSED_VIDEO_CONTENT_TYPE
    ) {
      const storageKey = getProcessedVideoStorageKey(video.userId, video.id);
      if (storageKey)
        return await createVideoDownloadUrl(storageKey, PROCESSED_VIDEO_CONTENT_TYPE, video.title);
    }
    if (video.processingStatus === "uploading") throw new Error("Recording upload is incomplete");
    const rawKey = getRawVideoStorageKey(video.userId, video.id);
    return await createVideoDownloadUrl(rawKey, RAW_VIDEO_CONTENT_TYPE, video.title);
  } catch (error) {
    console.error("Error generating download URL:", error);
    throw new Error("Failed to generate download URL");
  }
};
