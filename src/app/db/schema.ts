import { pgTable, text, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";

export const Users = pgTable("users", {
  id: text("id").primaryKey().notNull(), //Clerk_ID
  createdAt: timestamp("created_at").defaultNow().notNull(),
  username: text("username").notNull(),
  email: text("email").notNull(),
});

export const Videos = pgTable("videos", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => Users.id),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  metadata: jsonb("metadata"), // Store Google Video Intelligence API results
  status: text("status").notNull().default("processing"), // processing, ready, failed
});
