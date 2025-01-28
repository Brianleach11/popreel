import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { Users, Videos, analytics, userEmbeddings, VideoLikes } from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, {
  schema: { Users, Videos, analytics, userEmbeddings, VideoLikes },
});

export default db;
