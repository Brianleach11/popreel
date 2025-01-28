import LandingPage from "@/components/landing/landing-page";
import { getSignedUrl } from "@/lib/video";
import { desc } from "drizzle-orm";
import db from "./db";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { Videos } from "./db/schema";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/feed");
  }

  const videos = await db.query.Videos.findMany({
    orderBy: [desc(Videos.trendingScore)],
    limit: 10,
    where: eq(Videos.status, "ready"),
  });

  // Get signed URLs for videos
  const videosWithUrls = await Promise.all(
    videos.map(async (video) => ({
      id: video.id,
      url: await getSignedUrl(video.fileUrl),
      title: video.title,
      description: video.description || "",
      likes: video.likes,
      comments: 0, // We'll implement comments later
      userId: video.userId,
      userName: "Loading...", // We'll fetch this in the client
      status: video.status,
      trendingScore: video.trendingScore || 0,
      createdAt: video.createdAt.toISOString(),
    }))
  );

  return <LandingPage isSignedIn={false} initialVideos={videosWithUrls} />;
}