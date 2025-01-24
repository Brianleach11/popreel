import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch videos from your backend (replace with actual logic)
  const videos = await fetchVideosForUser(userId);

  return NextResponse.json({ videos });
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, description, tags, videoUrl } = await request.json();

  // Save video metadata to your backend (replace with actual logic)
  const video = await saveVideoMetadata(userId, { title, description, tags, videoUrl });

  return NextResponse.json({ video });
}

// Mock functions (replace with actual backend calls)
async function fetchVideosForUser(userId: string) {
  //TODO: Implement fetchVideos
  const videos = [];
  videos.push({ id: userId, title: "Video 1", description: "Description 1", tags: ["funny", "short"], videoUrl: "https://example.com/video1.mp4" });
  videos.push({ id: 2, title: "Video 2", description: "Description 2", tags: ["educational", "long"], videoUrl: "https://example.com/video2.mp4" });
  return videos;
}
//TODO: Implement metadata interface
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function saveVideoMetadata(userId: string, metadata: any) {
  return { id: 3, ...metadata };
}