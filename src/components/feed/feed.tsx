"use client";

import * as React from "react";
import { useInView } from "react-intersection-observer";
import { Loader2, MessageSquare, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/video/video-player";
import { useVideoAnalytics } from "@/lib/hooks/use-video-analytics";
import { useAuth } from "@clerk/nextjs";

interface Video {
  id: number;
  url: string;
  title: string;
  description: string;
  likes: number;
  comments: number;
  userId: string;
  userName: string;
}

function VideoItem({
  video,
  isPlaying,
  onVisibilityChange,
  onPlayPause,
}: {
  video: Video;
  isPlaying: boolean;
  onVisibilityChange: (inView: boolean) => void;
  onPlayPause: (playing: boolean) => void;
}) {
  const { userId } = useAuth();
  const { trackEvent, finalize } = useVideoAnalytics(video.id);
  const totalDurationRef = React.useRef<number | null>(null);

  const { ref } = useInView({
    threshold: 0.55,
    onChange: (inView) => {
      onVisibilityChange(inView);
      if (userId) {
        if (inView) {
          // Start tracking when video comes into view
          trackEvent(userId, "view", true);
        } else {
          // Finalize analytics when scrolling away
          finalize();
        }
      }
    },
  });

  const handleVideoProgress = React.useCallback(
    (state: { played: number; playedSeconds: number }) => {
      totalDurationRef.current = state.playedSeconds / state.played;
    },
    []
  );

  const handleLike = () => {
    if (userId) {
      trackEvent(userId, "like");
    }
    // TODO: Implement like functionality
  };

  const handleComment = () => {
    if (userId) {
      trackEvent(userId, "comment");
    }
    // TODO: Implement comment functionality
  };

  const handleShare = () => {
    if (userId) {
      trackEvent(userId, "share");
    }
    // TODO: Implement share functionality
  };

  return (
    <div
      ref={ref}
      className="relative w-full h-[100dvh] snap-start snap-always"
    >
      <div className="flex gap-4 h-full">
        {/* Main video content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 relative">
            <VideoPlayer
              url={video.url}
              playing={isPlaying}
              onPlayPause={onPlayPause}
              handleProgress={handleVideoProgress}
              onEnded={() => onPlayPause(true)}
              className="absolute inset-0"
            />
          </div>

          {/* User info and description */}
          <div className="px-4 py-3 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 rounded-full bg-gray-800 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-white text-sm truncate">
                  {video.userName}
                </h3>
                <p className="text-sm text-gray-400 truncate">{video.title}</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 line-clamp-2">
              {video.description}
            </p>
          </div>
        </div>

        {/* Interaction buttons on the right */}
        <div className="flex flex-col items-center justify-center gap-8 pr-4">
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center gap-1.5 hover:bg-transparent text-white hover:text-primary transition-colors"
            onClick={handleLike}
          >
            <Heart className="h-7 w-7" />
            <span className="text-xs font-medium">{video.likes}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center gap-1.5 hover:bg-transparent text-white hover:text-primary transition-colors"
            onClick={handleComment}
          >
            <MessageSquare className="h-7 w-7" />
            <span className="text-xs font-medium">{video.comments}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center gap-1.5 hover:bg-transparent text-white hover:text-primary transition-colors"
            onClick={handleShare}
          >
            <Share2 className="h-7 w-7" />
            <span className="text-xs font-medium">Share</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Feed() {
  const [videos, setVideos] = React.useState<Video[]>([]);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = React.useState<number | null>(
    1
  );

  // Pagination observer
  const { ref: paginationRef, inView } = useInView({
    threshold: 0.5,
  });

  const loadMoreVideos = React.useCallback(async () => {
    if (loading) return;
    setLoading(true);

    // TODO: Replace with actual API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newVideos = Array.from({ length: 5 }, (_, i) => ({
      id: (page - 1) * 5 + i + 1,
      url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      title: `Video ${(page - 1) * 5 + i + 1}`,
      description:
        "This is a sample video description showcasing the latest trends and updates.",
      likes: Math.floor(Math.random() * 1000),
      comments: Math.floor(Math.random() * 100),
      userId: "user123",
      userName: "John Doe",
    }));

    setVideos((prev) => [...prev, ...newVideos]);
    setPage((prev) => prev + 1);
    setLoading(false);
  }, [page, loading]);

  React.useEffect(() => {
    if (inView) {
      loadMoreVideos();
    }
  }, [inView, loadMoreVideos]);

  return (
    <div className="h-[100dvh] overflow-y-auto snap-y snap-mandatory">
      <div className="flex flex-col items-center w-full max-w-3xl mx-auto bg-black">
        {videos.map((video) => (
          <VideoItem
            key={video.id}
            video={video}
            isPlaying={currentlyPlaying === video.id}
            onVisibilityChange={(inView) => {
              if (inView) {
                setCurrentlyPlaying(video.id);
              }
            }}
            onPlayPause={(playing) =>
              setCurrentlyPlaying(playing ? video.id : null)
            }
          />
        ))}

        <div ref={paginationRef} className="w-full flex justify-center p-4">
          {loading && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
        </div>
      </div>
    </div>
  );
}
