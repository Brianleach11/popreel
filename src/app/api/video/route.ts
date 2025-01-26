import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { protos } from "@google-cloud/video-intelligence";
import db from "@/app/db";
import { Videos } from "@/app/db/schema";
import { processMetadata, VideoMetadata } from "@/lib/ml/extract-metadata";
import { getVideoDurationInSeconds } from "get-video-duration";
import { generateEmbedding } from "@/lib/ml/generate-embeddings";
import { storage, videoIntelligenceClient, bucketName } from "@/lib/gcp-config";

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

    const [operation] = await videoIntelligenceClient.annotateVideo({
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
    const annotations = results.annotationResults[0] as VideoMetadata;

    const extractedMetadata = await processMetadata(annotations);

    if (extractedMetadata.hasSexualContent) {
      return NextResponse.json(
        { error: "Video contains sexual content" },
        { status: 400 }
      );
    }

    ////////////
    //create embedding for video
    ////////////

    const embeddingText = [
      title,
      description,
      ...extractedMetadata.entities,
      ...extractedMetadata.significantText,
    ].join(" ");

    const embedding = await generateEmbedding(embeddingText);
    const duration = await getVideoDurationInSeconds(buffer.toString());
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
        duration: Math.round(duration),
        embedding,
      })
      .returning();

    //post video to kafka
    await fetch(`${process.env.BACKEND_URL}/api/kafka/video`, {
      method: "POST",
      body: JSON.stringify(video[0]),
    });

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
