//TODO: Implement feed page
//TODO: Infinite scroll feed component so it can be used inside and outside of auth
import { Feed } from "@/components/feed/feed";

export default async function FeedPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  //const baseUrl = "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/video?mode=recommended`, {
    cache: "no-store",
  });
  const { videos, avatarUrls, usernames } = await response.json();

  return (
    <div className="bg-black w-screen">
      <Feed
        initialVideos={videos}
        initialAvatarUrls={avatarUrls}
        initialUsernames={usernames}
      />
    </div>
  );
}
