import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import db from "@/app/db";
import { Videos } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";
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
    await db
      .delete(Videos)
      .where(and(eq(Videos.id, id), eq(Videos.userId, userId)));

    //TODO: Delete from kafka and pinecone

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
