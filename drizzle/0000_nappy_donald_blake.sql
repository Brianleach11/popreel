CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"clerk_id" text NOT NULL
);
