ALTER TABLE "snappit_videos" ALTER COLUMN "thumbnail_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "snappit_videos" DROP COLUMN "raw_video_id";--> statement-breakpoint
ALTER TABLE "snappit_videos" DROP COLUMN "processed_video_id";