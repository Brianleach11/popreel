ALTER TABLE "videos" ALTER COLUMN "embedding" SET DATA TYPE vector(1536);--> statement-breakpoint
ALTER TABLE "videos" ALTER COLUMN "embedding" SET NOT NULL;