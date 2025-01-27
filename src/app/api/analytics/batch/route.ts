import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import db from "@/app/db";
import { analytics, Videos } from "@/app/db/schema";
import { calculateInteractionScore } from "@/lib/ml/scoring";
import { and, eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { events } = await req.json();
    if (!Array.isArray(events) || events.length === 0) {
      return new NextResponse("Invalid request body", { status: 400 });
    }

    // Validate all events have the required userId and viewDuration
    const validEvents = events.filter(
      (event) =>
        event.userId === userId &&
        typeof event.viewDuration === "number" &&
        event.viewDuration >= 0
    );

    if (validEvents.length === 0) {
      return new NextResponse("No valid events provided", { status: 400 });
    }

    // Get video durations for score calculation
    const videoIds = validEvents.map((event) => event.videoId);
    const videos = await db
      .select({ id: Videos.id, duration: Videos.duration })
      .from(Videos)
      .where(and(...videoIds.map((id) => eq(Videos.id, id))));

    const videoDurations = new Map(videos.map((v) => [v.id, v.duration || 0]));

    const processedValidEvents = validEvents.map((event) => {
      const videoDuration = videoDurations.get(event.videoId) || 0;
      const weightedScore = calculateInteractionScore({
        viewDuration: event.viewDuration,
        videoDuration,
        liked: event.liked || false,
        commented: event.commented || false,
        shared: event.shared || false,
        timestamp: new Date(),
      });
      return {
        userId: event.userId,
        videoId: event.videoId,
        viewDuration: event.viewDuration,
        liked: event.liked || false,
        commented: event.commented || false,
        shared: event.shared || false,
        timestamp: new Date(),
        weightedScore,
      };
    });

    // Calculate weighted scores and insert events
    await db.insert(analytics).values(processedValidEvents);

    //post to kafka
    await fetch(`${process.env.BACKEND_URL}/api/kafka/interaction`, {
      method: "POST",
      body: JSON.stringify(processedValidEvents),
    });

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("[ANALYTICS_BATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
