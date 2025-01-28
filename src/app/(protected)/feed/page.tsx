//TODO: Implement feed page
//TODO: Infinite scroll feed component so it can be used inside and outside of auth
import { Feed } from "@/components/feed/feed";
import { auth } from "@clerk/nextjs/server";

export default async function FeedPage() {
  const authHelper = await auth();
  const token = await authHelper.getToken();

  const response = await fetch(
    `${
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    }/api/video?mode=recommended`,
    {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  const { videos, avatarUrls, usernames } = await response.json();

  return (
    <div className="bg-black w-screen">
      <Feed
        initialVideos={videos}
        initialAvatarUrls={avatarUrls}
        initialUsernames={usernames}
        mode="recommended"
      />
    </div>
  );
}
