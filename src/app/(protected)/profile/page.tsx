import { ProfileHeader } from "@/components/profile/profile-header";
import { VideoGrid } from "@/components/profile/video-grid";
import { auth } from "@clerk/nextjs/server";
import db from "@/app/db";
import { Users, Videos } from "@/app/db/schema";
import { eq } from "drizzle-orm";
import { getSignedUrl } from "@/lib/video";
import { cache } from "react";
import { Separator } from "@/components/ui/separator";

// Cache the data fetching at the page level
const getData = cache(async (userId: string) => {
  // Get user data
  const user = await db.query.Users.findFirst({
    where: eq(Users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Get signed URL for avatar if it exists
  let signedAvatarUrl: string | undefined;
  if (user.avatarUrl) {
    try {
      signedAvatarUrl = await getSignedUrl(user.avatarUrl);
    } catch (error) {
      console.error("Error getting signed avatar URL:", error);
      // If we can't get the signed URL, we'll fall back to the default avatar
    }
  }

  // Get user's videos
  const videos = await db.query.Videos.findMany({
    where: eq(Videos.userId, userId),
    orderBy: (videos) => videos.createdAt,
  });

  // Process videos to get signed URLs
  const processedVideos = await Promise.all(
    videos.map(async (video) => {
      try {
        const videoUrl = await getSignedUrl(video.fileUrl);
        return {
          ...video,
          url: videoUrl,
        };
      } catch (error) {
        console.error(`Error processing video ${video.id}:`, error);
        return null;
      }
    })
  );

  // Filter out any videos that failed to process
  const validVideos = processedVideos.filter(
    (video): video is NonNullable<typeof video> => video !== null
  );

  return {
    user: {
      ...user,
      avatarUrl: signedAvatarUrl,
    },
    videos: validVideos,
  };
});

export default async function ProfilePage() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("User not authenticated");
  }

  const data = await getData(userId);

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 bg-black text-white">
      <div className="relative space-y-8">
        <ProfileHeader
          username={data.user.username}
          email={data.user.email}
          avatarUrl={data.user.avatarUrl}
        />
        <Separator />
        <VideoGrid videos={data.videos} />
      </div>
    </div>
  );
}
