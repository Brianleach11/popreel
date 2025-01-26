CREATE TABLE "user_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"embedding" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "duration" integer;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "embedding" jsonb;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "trending_score" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "analytics" ADD COLUMN "weighted_score" real;--> statement-breakpoint
ALTER TABLE "user_embeddings" ADD CONSTRAINT "user_embeddings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_user_id_idx" ON "analytics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "analytics_video_id_idx" ON "analytics" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "analytics_timestamp_idx" ON "analytics" USING btree ("timestamp");