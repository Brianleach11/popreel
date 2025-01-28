import { sql } from "drizzle-orm";
import {
  text,
  pgTable,
  timestamp,
  integer,
  uuid,
  jsonb,
  boolean,
  real,
  index,
} from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";

const vector = customType<{
  data: number[];
  driverData: string;
}>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`; // Convert array to PostgreSQL array syntax
  },
  fromDriver(value: string): number[] {
    return value
      .slice(1, -1) // Remove brackets
      .split(",") // Split into array
      .map(Number); // Convert to numbers
  },
});

// Analytics table for raw interaction data
export const analytics = pgTable(
  "analytics",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    userId: text("user_id").notNull(),
    videoId: integer("video_id").notNull(),
    viewDuration: integer("view_duration").notNull(), // in seconds
    liked: boolean("liked").default(false).notNull(),
    commented: boolean("commented").default(false).notNull(),
    shared: boolean("shared").default(false).notNull(),
    timestamp: timestamp("timestamp")
      .default(sql`now()`)
      .notNull(),
    weightedScore: real("weighted_score"), // Computed interaction score
  },
  (table) => ({
    // Indexes for faster queries in ML pipeline
    userIdIdx: index("analytics_user_id_idx").on(table.userId),
    videoIdIdx: index("analytics_video_id_idx").on(table.videoId),
    timestampIdx: index("analytics_timestamp_idx").on(table.timestamp),
  })
);

// User embeddings table for ML recommendations
export const userEmbeddings = pgTable("user_embeddings", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => Users.id),
  embedding: vector("embedding").notNull(), // Store as JSON array initially, can move to pgvector later
  updatedAt: timestamp("updated_at")
    .default(sql`now()`)
    .notNull(),
});

// Video metadata and embeddings
export const Videos = pgTable("videos", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => Users.id),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  duration: integer("duration"), // Video duration in seconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
  metadata: jsonb("metadata"), // Store Google Video Intelligence API results
  embedding: vector("embedding").notNull(), // Content-based embedding from metadata
  status: text("status").notNull().default("processing"), // processing, ready, failed
  trendingScore: real("trending_score").default(0), // For cold start recommendations
  likes: integer("likes").default(0).notNull(), // Track total likes count
});

export const Users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk_ID
  username: text("username").notNull(),
  email: text("email").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at")
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`now()`)
    .notNull(),
});

// Video likes junction table
export const VideoLikes = pgTable(
  "video_likes",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => Users.id),
    videoId: uuid("video_id")
      .notNull()
      .references(() => Videos.id),
    createdAt: timestamp("created_at")
      .default(sql`now()`)
      .notNull(),
  },
  /*(table) => ({
    // Compound unique index to prevent duplicate likes
    userVideoIdx: index("video_likes_user_video_idx")
      .on(table.userId, table.videoId)
      .unique(),
  })*/
);
