import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import { VideoIntelligenceServiceClient } from "@google-cloud/video-intelligence";
import { protos } from "@google-cloud/video-intelligence";
import db from "@/app/db";
import { Videos } from "@/app/db/schema";

const storage = new Storage();
const videoClient = new VideoIntelligenceServiceClient();

//get recommended videos to populate feed

//post a video

//get a user's videos

//get a video by id

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  try {
    /////////////
    //upload video to GCS Bucket
    /////////////
    const buffer = Buffer.from(await file.arrayBuffer());
    const bucketName = process.env.GCS_BUCKET_NAME!;
    //files saved as user_id/filename-timestamp
    const fileName = `${userId}/${file.name}-${Date.now()}`;
    const gcsFile = storage.bucket(bucketName).file(fileName);

    await gcsFile.save(buffer, {
      metadata: { contentType: file.type },
    });

    /////////////
    //annotate video with google intelligence api
    /////////////
    const gcsUrl = `gs://${bucketName}/${fileName}`;

    const [operation] = await videoClient.annotateVideo({
      inputUri: gcsUrl,
      features: [
        protos.google.cloud.videointelligence.v1.Feature.LABEL_DETECTION,
        protos.google.cloud.videointelligence.v1.Feature
          .EXPLICIT_CONTENT_DETECTION,
        protos.google.cloud.videointelligence.v1.Feature.TEXT_DETECTION,
      ],
    });

    const [results] = await operation.promise();
    if (!results || !results.annotationResults) {
      return NextResponse.json(
        { error: "Failed to process video" },
        { status: 500 }
      );
    }
    const annotations = results.annotationResults[0];

    ////////////
    //save metadata to db using drizzle
    ////////////
    const video = await db
      .insert(Videos)
      .values({
        userId,
        title,
        description,
        fileUrl: gcsUrl,
        metadata: annotations,
      })
      .returning();

    return NextResponse.json(
      { message: "Video uploaded successfully", video: video[0] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error uploading video: ", error);
    return NextResponse.json(
      {
        error:
          "Failed to process video. Please try a smaller file or different format.",
      },
      { status: 500 }
    );
  }
}
