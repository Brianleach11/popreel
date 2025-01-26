import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import db from "@/app/db";
import { Users } from "@/app/db/schema";
import { eq } from "drizzle-orm";
import { storage, bucketName } from "@/lib/gcp-config";

async function deleteExistingAvatar(userId: string) {
  try {
    // List all files in the user's avatar directory
    const [files] = await storage.bucket(bucketName).getFiles({
      prefix: `avatars/${userId}/avatar-`,
    });

    // Delete each existing avatar file
    await Promise.all(files.map((file) => file.delete()));
  } catch (error) {
    console.error("Error deleting existing avatar:", error);
    // Don't throw error, continue with upload
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("avatar") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate unique filename
    const extension = file.name.split(".").pop();
    const filename = `${userId}/avatar-${Date.now()}.${extension}`;
    const fullPath = `avatars/${filename}`;
    const gcsPath = `gs://${bucketName}/${fullPath}`;

    // Delete any existing avatar files for this user
    await deleteExistingAvatar(userId);

    // Upload to Google Cloud Storage
    const gcsFile = storage.bucket(bucketName).file(fullPath);
    await gcsFile.save(buffer, {
      metadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000", // Cache for 1 year
      },
    });

    // Generate signed URL for immediate use
    const [signedUrl] = await gcsFile.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Update user's avatar URL in database with GCS path
    await db
      .update(Users)
      .set({ avatarUrl: gcsPath })
      .where(eq(Users.id, userId));

    // Return signed URL for immediate use in the UI
    return NextResponse.json({ avatarUrl: signedUrl });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 }
    );
  }
}
