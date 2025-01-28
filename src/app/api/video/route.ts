import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { protos } from "@google-cloud/video-intelligence";
import db from "@/app/db";
import { Videos, Users, VideoLikes } from "@/app/db/schema";
import { processMetadata, VideoMetadata } from "@/lib/ml/extract-metadata";
import { generateEmbedding } from "@/lib/ml/generate-embeddings";
import { storage, videoIntelligenceClient, bucketName } from "@/lib/gcp-config";
import { desc, eq, sql, and, inArray } from "drizzle-orm";
import { InferSelectModel } from "drizzle-orm";
import { getSignedUrl } from "@/lib/video";

type Video = InferSelectModel<typeof Videos>;
interface VideoWithSimilarity extends Video {
  similarity_score?: number;
  url?: string;
  avatarUrl?: string;
  isLiked?: boolean;
}

// Get recommended videos for feed
// Request expects mode and page
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  console.log("GET REQUEST USER ID: ", userId);
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "recommended"; // recommended, trending, or explore
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    let videos: VideoWithSimilarity[];
    const usernames: string[] = [];

    if (!userId || mode === "trending") {
      // For non-authenticated users or trending mode, return videos sorted by trending score
      videos = await db.query.Videos.findMany({
        orderBy: [desc(Videos.trendingScore), desc(Videos.createdAt)],
        limit,
        offset,
        where: eq(Videos.status, "ready"),
      });
    } else if (mode === "recommended") {
      // Get recommended video IDs from backend
      const recommendResponse = await fetch(
        `${process.env.BACKEND_URL}/api/recommendations?user_id=${userId}&limit=${limit}&offset=${offset}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!recommendResponse.ok) {
        // Fallback to trending if recommendation fails
        videos = await db.query.Videos.findMany({
          orderBy: [desc(Videos.trendingScore), desc(Videos.createdAt)],
          limit,
          offset,
          where: eq(Videos.status, "ready"),
        });
      } else {
        const { videoIds } = await recommendResponse.json();
        if (!videoIds?.length) {
          // Fallback to trending if no recommendations
          videos = await db.query.Videos.findMany({
            orderBy: [desc(Videos.trendingScore), desc(Videos.createdAt)],
            limit,
            offset,
            where: eq(Videos.status, "ready"),
          });
        } else {
          // Get video details for recommended IDs
          videos = await db.query.Videos.findMany({
            where: and(
              eq(Videos.status, "ready"),
              inArray(Videos.id, videoIds)
            ),
            // Keep original order from recommendations
            orderBy: sql`array_position(array[${sql.join(
              videoIds
            )}]::uuid[], id)`,
          });
        }
      }
    } else {
      // Explore mode - return a mix of trending and recent videos
      videos = await db.query.Videos.findMany({
        orderBy: [sql`RANDOM() * trending_score DESC`, desc(Videos.createdAt)],
        limit,
        offset,
        where: eq(Videos.status, "ready"),
      });
    }

    // Get signed URLs for videos and user info
    const videosWithUrls = await Promise.all(
      videos.map(async (video: VideoWithSimilarity) => {
        const file = storage
          .bucket(bucketName)
          .file(video.fileUrl.replace(`gs://${bucketName}/`, ""));
        const [signedUrl] = await file.getSignedUrl({
          version: "v4",
          action: "read",
          expires: Date.now() + 1 * 60 * 60 * 1000, // 1 hour
        });
        let avatarUrl = "";
        let username = "Unknown User";
        // Get user's info
        if (userId) {
          const user = (await db.query.Users.findFirst({
            where: eq(Users.id, userId),
          })) || { id: "", username: "", email: "", avatarUrl: null };

          console.log("USER TO LIKE", userId);
          const isLiked = await db.query.VideoLikes.findFirst({
            where: and(
              eq(VideoLikes.userId, user.id),
              eq(VideoLikes.videoId, video.id)
            ),
          });
          console.log("IS LIKED: ", isLiked);
          video.isLiked = isLiked ? true : false;

          if (user) {
            username = user.username;
            if (user.avatarUrl) {
              try {
                avatarUrl = await getSignedUrl(user.avatarUrl);
              } catch (error) {
                console.error("Error getting signed avatar URL:", error);
              }
            }
          }
        }

        usernames.push(username);
        console.log("USERNAME: ", username);
        return { ...video, url: signedUrl, avatarUrl };
      })
    );

    const avatarUrls = videosWithUrls.map((video) => video.avatarUrl);
    const cleanVideos = videosWithUrls.map((video) => ({
      ...video,
      avatarUrl: undefined,
    }));

    return NextResponse.json({
      videos: cleanVideos,
      avatarUrls,
      usernames,
      hasMore: videos.length === limit,
    });
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}

// Post a new video
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const duration = parseInt(formData.get("duration") as string);

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (isNaN(duration) || duration <= 0) {
    return NextResponse.json(
      { error: "Invalid video duration" },
      { status: 400 }
    );
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

    // Save metadata to db using drizzle
    const video = await db
      .insert(Videos)
      .values({
        userId,
        title,
        description,
        fileUrl: gcsUrl,
        metadata: annotations,
        duration,
        embedding,
      })
      .returning();
    // Post video to kafka for background processing
    await fetch(`${process.env.BACKEND_URL}/api/kafka/video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
