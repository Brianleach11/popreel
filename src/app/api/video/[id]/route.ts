import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import db from "@/app/db";
import { Videos } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME!;

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, get the video details to ensure it exists and belongs to the user
    const video = await db.query.Videos.findFirst({
      where: and(eq(Videos.id, params.id), eq(Videos.userId, userId)),
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

      // Also try to delete any associated thumbnail if it exists
      const thumbnailPath = video.fileUrl.replace(
        video.fileUrl.split("/").pop()!,
        `thumbnails/thumb-${video.fileUrl.split("/").pop()!}.jpg`
      );
      try {
        const thumbnailFile = storage
          .bucket(bucketName)
          .file(thumbnailPath.replace(`gs://${bucketName}/`, ""));
        await thumbnailFile.delete();
      } catch (error) {
        // Ignore thumbnail deletion errors
        console.log("No thumbnail found or error deleting thumbnail:", error);
      }
    } catch (error) {
      console.error("Error deleting file from storage:", error);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete the video record from the database
    await db
      .delete(Videos)
      .where(and(eq(Videos.id, params.id), eq(Videos.userId, userId)));

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
