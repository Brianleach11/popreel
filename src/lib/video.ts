import { Storage } from "@google-cloud/storage";
import ffmpeg from "fluent-ffmpeg";
import { join } from "path";
import fs from "fs";
import os from "os";

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME!;

export async function generateThumbnail(gcsPath: string): Promise<string> {
  try {
    // Extract filename from GCS path (format: gs://bucket/userId/filename)
    const filename = gcsPath.split("/").pop()!;
    const tempDir = os.tmpdir();
    const tempVideoPath = join(tempDir, `temp-${filename}`);
    const tempThumbnailPath = join(tempDir, `thumb-${filename}.jpg`);

    // Download video to temp directory
    await storage
      .bucket(bucketName)
      .file(gcsPath.replace(`gs://${bucketName}/`, ""))
      .download({ destination: tempVideoPath });

    // Generate thumbnail using FFmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(tempVideoPath)
        .screenshots({
          timestamps: [0], // Take screenshot at 0 seconds (first frame)
          filename: `thumb-${filename}.jpg`,
          folder: tempDir,
          size: "480x854", // 9:16 aspect ratio, good size for thumbnails
        })
        .on("end", resolve)
        .on("error", reject);
    });

    // Upload thumbnail to GCS
    const thumbnailDestination = gcsPath.replace(
      filename,
      `thumbnails/thumb-${filename}.jpg`
    );
    await storage.bucket(bucketName).upload(tempThumbnailPath, {
      destination: thumbnailDestination.replace(`gs://${bucketName}/`, ""),
      metadata: {
        cacheControl: "public, max-age=31536000", // Cache for 1 year
      },
    });

    // Clean up temp files
    fs.unlinkSync(tempVideoPath);
    fs.unlinkSync(tempThumbnailPath);

    return thumbnailDestination;
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    throw error;
  }
}

// Get signed URL for video or thumbnail with caching
export async function getSignedUrl(gcsPath: string): Promise<string> {
  try {
    const file = storage
      .bucket(bucketName)
      .file(gcsPath.replace(`gs://${bucketName}/`, ""));

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error("File not found");
    }

    // Generate a signed URL with shorter expiration
    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 1 * 60 * 60 * 1000, // 1 hour expiration
    });

    return url;
  } catch (error) {
    console.error("Error getting signed URL:", error);
    // Return a default placeholder image URL if there's an error
    return "/placeholder.svg";
  }
}
