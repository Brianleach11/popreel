CREATE TABLE "analytics" (
	"user_id" text NOT NULL,
	"video_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"data" json NOT NULL,
	CONSTRAINT "analytics_user_id_video_id_timestamp_pk" PRIMARY KEY("user_id","video_id","timestamp")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;