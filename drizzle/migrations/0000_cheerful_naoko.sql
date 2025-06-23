CREATE TABLE "snappit_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snappit_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "snappit_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "snappit_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "snappit_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "snappit_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "snappit_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"video_url" text NOT NULL,
	"video_id" text NOT NULL,
	"thumbnail_url" text NOT NULL,
	"visibility" text NOT NULL,
	"user_id" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"duration" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "snappit_videos_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "snappit_account" ADD CONSTRAINT "snappit_account_user_id_snappit_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."snappit_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snappit_session" ADD CONSTRAINT "snappit_session_user_id_snappit_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."snappit_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snappit_videos" ADD CONSTRAINT "snappit_videos_user_id_snappit_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."snappit_user"("id") ON DELETE cascade ON UPDATE no action;