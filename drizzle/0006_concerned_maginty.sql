ALTER TABLE "analytics" DROP CONSTRAINT "analytics_user_id_video_id_pk";--> statement-breakpoint
ALTER TABLE "analytics" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;