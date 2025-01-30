import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import db from "@/app/db";
import { analytics, Videos } from "@/app/db/schema";
import { calculateInteractionScore } from "@/lib/ml/scoring";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { event } = await req.json();
    if (!event) {
      return new NextResponse("Invalid request body", { status: 400 });
    }

    // Get video durations for score calculation
    const video_duration = await db
      .select({ id: Videos.id, duration: Videos.duration })
      .from(Videos)
      .where(eq(Videos.id, event.videoId));

    if (!video_duration || video_duration[0].duration === null) {
      return new NextResponse("Video not found", { status: 404 });
    }
    const timestamp = new Date();
    const weightedScore = calculateInteractionScore({
      viewDuration: event.viewDuration,
      videoDuration: video_duration[0].duration,
      liked: event.liked || false,
      commented: event.commented || false,
      shared: event.shared || false,
      timestamp,
    });
    const processedEvent = {
      userId: event.userId,
      videoId: event.videoId,
      viewDuration: event.viewDuration,
      liked: event.liked || false,
      commented: event.commented || false,
      shared: event.shared || false,
      timestamp: timestamp,
      weightedScore,
    };

    // Insert into database
    await db.insert(analytics).values(processedEvent);

    // Prepare Kafka message with ISO string timestamps
    const kafkaEvent = {
      ...processedEvent,
      timestamp: processedEvent.timestamp.toISOString(),
    };

    // Post to kafka
    const response = await fetch(
      `${process.env.BACKEND_URL}/api/kafka/interaction`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(kafkaEvent),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to post to Kafka");
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("[ANALYTICS_BATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
