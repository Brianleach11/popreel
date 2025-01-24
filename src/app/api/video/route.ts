import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
//get recommended videos to populate feed

//post a video

//get a user's videos

//get a video by id

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { title } = await request.json();

  return NextResponse.json({ message:  `Video uploaded ${title ?? "no title"}` }, { status: 200 });
  //upload to vercel blob storage
  //extract metadata from video
  //save metadata to database
}
