import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import db from "@/app/db";
import { Videos, VideoLikes } from "@/app/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { storage, bucketName } from "@/lib/gcp-config";

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = request.nextUrl.pathname.split("/").pop();
    if (!id) {
      return NextResponse.json({ error: "Invalid video ID" }, { status: 400 });
    }

    // First, get the video details to ensure it exists and belongs to the user
    const video = await db.query.Videos.findFirst({
      where: and(eq(Videos.id, id), eq(Videos.userId, userId)),
    });

    if (!video) {
      return NextResponse.json(
        { error: "Video not found or unauthorized" },
        { status: 404 }
      );
    }

    // Delete the video file from Google Cloud Storage
    try {
      const videoFile = storage
        .bucket(bucketName)
        .file(video.fileUrl.replace(`gs://${bucketName}/`, ""));
      await videoFile.delete();
    } catch (error) {
      console.error("Error deleting file from storage:", error);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete the video record from the database
    try {
      await db
        .delete(Videos)
        .where(and(eq(Videos.id, id), eq(Videos.userId, userId)));
    } catch (error) {
      console.error("Error deleting from database:", error);
      // Continue even if database deletion fails
    }

    //Delete from pinecone
    try {
      await fetch(`${process.env.BACKEND_URL}/webhook/video/${id}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Error deleting from Pinecone:", error);
      // Continue even if Pinecone deletion fails
    }

    return NextResponse.json(
      { message: "Video deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting video:", error);
    return NextResponse.json(
      { error: "Failed to delete video" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = request.nextUrl.pathname.split("/").pop();
    if (!id) {
      return NextResponse.json({ error: "Invalid video ID" }, { status: 400 });
    }

    const { action } = await request.json();
    if (action !== "like" && action !== "unlike") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (action === "like") {
      // Add like record
      await db
        .insert(VideoLikes)
        .values({
          userId,
          videoId: id,
        })
        .onConflictDoNothing();
    } else {
      // Remove like record
      await db
        .delete(VideoLikes)
        .where(and(eq(VideoLikes.videoId, id), eq(VideoLikes.userId, userId)));
    }

    // Update likes count
    const video = await db
      .update(Videos)
      .set({
        likes:
          action === "like"
            ? sql`${Videos.likes} + 1`
            : sql`GREATEST(${Videos.likes} - 1, 0)`,
      })
      .where(eq(Videos.id, id))
      .returning();

    if (!video || video.length === 0) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    return NextResponse.json({ video: video[0] });
  } catch (error) {
    console.error("Error updating video:", error);
    return NextResponse.json(
      { error: "Failed to update video" },
      { status: 500 }
    );
  }
}
