import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import db from "@/app/db";
import { eq } from "drizzle-orm";
import { Users, Videos } from "@/app/db/schema";
import { getSignedUrl } from "@/lib/video";
import { ProfileHeader } from "@/components/profile/profile-header";
import { Separator } from "@/components/ui/separator";
import { VideoGrid } from "@/components/profile/video-grid";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId: currentUserId } = await auth();
  const { id } = await params;

  // If viewing own profile, redirect to /profile
  if (currentUserId === id) {
    redirect("/profile");
  }

  // Get user info
  const profileUser = await db.query.Users.findFirst({
    where: eq(Users.id, id),
  });

  if (!profileUser) {
    redirect("/404");
  }

  // Get user's videos
  const videos = await db.query.Videos.findMany({
    where: eq(Videos.userId, id),
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
    <div className="min-h-screen bg-black">
      <ProfileHeader
        username={profileUser.username}
        email={profileUser.email}
        avatarUrl={avatarUrl}
        isReadOnly={true}
      />
      <Separator />
      <VideoGrid videos={videosWithUrls} isReadOnly={true} />
    </div>
  );
}
