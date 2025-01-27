import { ProfileHeader } from "@/components/profile/profile-header";
import { VideoGrid } from "@/components/profile/video-grid";
import { auth } from "@clerk/nextjs/server";
import db from "@/app/db";
import { Users, Videos } from "@/app/db/schema";
import { eq } from "drizzle-orm";
import { getSignedUrl } from "@/lib/video";
import { Separator } from "@/components/ui/separator";
import { redirect } from "next/navigation";


export default async function ProfilePage() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("User not authenticated");
  }

  const profileUser = await db.query.Users.findFirst({
    where: eq(Users.id, userId),
  });

  if (!profileUser) {
    redirect("/404");
  }

  // Get user's videos
  const videos = await db.query.Videos.findMany({
    where: eq(Videos.userId, userId),
    orderBy: (Videos, { desc }) => [desc(Videos.createdAt)],
  });

  // Get signed URLs for videos and avatar
  const videosWithUrls = await Promise.all(
    videos.map(async (video) => ({
      ...video,
      url: await getSignedUrl(video.fileUrl),
      userName: profileUser.username, // Add userName to match Video type
      trendingScore: video.trendingScore || 0,
      description: video.description || "",
      createdAt: video.createdAt.toISOString(),
    }))
  );

  const avatarUrl = profileUser.avatarUrl
    ? await getSignedUrl(profileUser.avatarUrl)
    : "";

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 bg-black text-white">
      <div className="relative space-y-8">
        <ProfileHeader
          username={profileUser.username}
          email={profileUser.email}
          avatarUrl={avatarUrl}
          isReadOnly={false}
        />
        <Separator />
        <VideoGrid videos={videosWithUrls} isReadOnly={false} />
      </div>
    </div>
  );
}
