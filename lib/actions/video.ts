"use server";

import { db } from "@/drizzle/db";
import { videos, user } from "@/drizzle/schema";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  PutObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@/lib/auth";
import {
  doesTitleMatch,
  generatePublicVideoUrl,
  getOrderByClause,
  withErrorHandling,
} from "@/lib/utils";
import { CDN, AWS_CONFIG } from "@/constants";
import aj, { fixedWindow, request } from "../arcjet";
import { getEnv } from "@/lib/utils";

// AWS Configuration
const AWS_ACCESS_KEY_ID = getEnv("AWS_ACCESS_KEY_ID");
const AWS_SECRET_ACCESS_KEY = getEnv("AWS_SECRET_ACCESS_KEY");
const AWS_REGION = getEnv("AWS_REGION");

const s3 = new S3Client({
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
  region: AWS_REGION,
});

const validateWithArcjet = async (fingerPrint: string) => {
  const rateLimit = aj.withRule(
    fixedWindow({
      mode: "LIVE",
      window: "1m",
      max: 2,
      characteristics: ["fingerprint"],
    })
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
export const getVideoUploadUrl = withErrorHandling(async () => {
  try {
    await getSessionUserId();

    const timestamp = Date.now();
    const videoId = `video-${timestamp}`;

    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: AWS_CONFIG.BUCKET_NAME,
        Key: videoId,
        // Expires: new Date(Date.now() + 3600 * 1000),
      }),
      {
        expiresIn: 3600,
      }
    );

    return {
      videoId,
      uploadUrl,
    };
  } catch (error) {
    console.error("Error getting video upload URL:", error);
    throw error;
  }
});

export const getThumbnailUploadUrl = withErrorHandling(
  async (videoId: string) => {
    // AWS S3 Implementation
    const thumbnailId = `thumbnail-${Date.now()}-${videoId}`;
    const cdnUrl = CDN.THUMBNAIL_URL(thumbnailId);

    // Generate presigned URL using AWS SDK
    // Note: This requires AWS SDK configuration in the server
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: AWS_CONFIG.BUCKET_NAME,
        Key: thumbnailId,
        // Expires: new Date(Date.now() + 3600 * 1000),
      }),
      {
        expiresIn: 3600,
      }
    );

    return {
      uploadUrl,
      cdnUrl,
    };
  }
);

export const saveVideoDetails = withErrorHandling(
  async (videoDetails: VideoDetails) => {
    const userId = await getSessionUserId();
    await validateWithArcjet(userId);

    // AWS Implementation
    const now = new Date();
    const videoUrl = CDN.VIDEO_URL(videoDetails.videoId);
    const publicVideoId = generatePublicVideoUrl();

    await db.insert(videos).values({
      ...videoDetails,
      videoUrl,
      publicVideoId,
      userId,
      createdAt: now,
      updatedAt: now,
    });

    revalidatePaths(["/"]);
    return { videoId: videoDetails.videoId };
  }
);

export const getVideoById = withErrorHandling(async (videoId: string) => {
  const [videoRecord] = await buildVideoWithUserQuery().where(
    eq(videos.videoId, videoId)
  );
  return videoRecord;
});

export const getVideoByPublicVideoId = withErrorHandling(
  async (publicVideoId: string) => {
    const [video] = await db
      .select({
        videoId: videos.videoId,
        publicVideoId: videos.publicVideoId,
        title: videos.title,
        description: videos.description,
        videoUrl: videos.videoUrl,
        views: videos.views,
        duration: videos.duration,
        createdAt: videos.createdAt,
        updatedAt: videos.updatedAt,
      })
      .from(videos)
      .where(
        and(
          eq(videos.publicVideoId, publicVideoId), eq(videos.visibility, "public")
        )
      );

    if (!video) return null;

    return {
      video,
    };
  }
);

export const incrementVideoViews = withErrorHandling(
  async (videoId: string) => {

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
    return {};
  }
);

export const getAllVideos = withErrorHandling(
  async (
    userIdParameter: string,
    searchQuery: string = "",
    sortFilter?: string,
    pageNumber: number = 1,
    pageSize: number = 8
  ) => {
    const currentUserId = (
      await auth.api.getSession({ headers: await headers() })
    )?.user.id;
    const isOwner = userIdParameter === currentUserId;

    if (!isOwner) {
      throw new Error("Unauthorized");
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
    if (!userInfo) throw new Error("User not found");

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
        sortFilter ? getOrderByClause(sortFilter) : desc(videos.createdAt)
      )
      .limit(pageSize)
      .offset((pageNumber - 1) * pageSize);

    return {
      user: userInfo,
      videos: userVideos,
      count: userVideos.length,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalVideos,
        pageSize,
      },
    };
  }
);

export const updateVideoVisibility = withErrorHandling(
  async (videoId: string, visibility: Visibility) => {
    await validateWithArcjet(videoId);
    await db
      .update(videos)
      .set({ visibility, updatedAt: new Date() })
      .where(eq(videos.videoId, videoId));

    revalidatePaths(["/", `/video/${videoId}`]);
    return {};
  }
);

export const deleteVideo = withErrorHandling(
  async (videoId: string, thumbnailUrl: string) => {
    
    // Delete video and thumbnail from S3
    const s3VideoKey = videoId;
    const thumbnailPath = thumbnailUrl.split("/")[thumbnailUrl.split("/").length - 1]; // get the path after the last slash

    await Promise.all([
      s3.send(
        new DeleteObjectCommand({
          Bucket: AWS_CONFIG.BUCKET_NAME,
          Key: s3VideoKey,
        })
      ),
      s3.send(
        new DeleteObjectCommand({
          Bucket: AWS_CONFIG.BUCKET_NAME,
          Key: thumbnailPath,
        })
      ),
    ]);

    // Delete from database
    await db.delete(videos).where(eq(videos.videoId, videoId));
    revalidatePaths(["/", `/video/${videoId}`]);
    return {};
  }
);

// const command = new GetObjectCommand(getObjectParams);
// const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
