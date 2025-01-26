ALTER TABLE "analytics" DROP CONSTRAINT "analytics_user_id_video_id_timestamp_pk";--> statement-breakpoint
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_user_id_video_id_pk" PRIMARY KEY("user_id","video_id");--> statement-breakpoint
ALTER TABLE "analytics" ADD COLUMN "view_duration" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics" ADD COLUMN "liked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics" ADD COLUMN "commented" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics" ADD COLUMN "shared" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics" DROP COLUMN "event_type";--> statement-breakpoint
ALTER TABLE "analytics" DROP COLUMN "data";