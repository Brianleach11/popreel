"use client";

import * as React from "react";
import { useInView } from "react-intersection-observer";
import {
  Loader2,
  MessageSquare,
  Heart,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/video/video-player";
import { useVideoAnalytics } from "@/lib/hooks/use-video-analytics";
import { useAuth } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export interface Video {
  id: string;
  url: string;
  title: string;
  description: string;
  likes: number;
  userId: string;
  userName: string;
  status: string;
  trendingScore: number;
  createdAt: string;
  isLiked?: boolean;
}

interface ApiResponse {
  videos: Video[];
  usernames: string[];
  avatarUrls: string[];
  hasMore: boolean;
}

function VideoItem({
  video,
  isPlaying,
  onVisibilityChange,
  onPlayPause,
  avatarUrl,
  username,
  setVideos,
}: {
  video: Video;
  isPlaying: boolean;
  onVisibilityChange: (inView: boolean) => void;
  onPlayPause: (playing: boolean) => void;
  avatarUrl: string;
  username: string;
  setVideos: React.Dispatch<React.SetStateAction<Video[]>>;
}) {
  const { userId } = useAuth();
  const { trackEvent, finalize } = useVideoAnalytics(video.id);
  const totalDurationRef = React.useRef<number | null>(null);
  const [showShareDialog, setShowShareDialog] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

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

  const handleLike = async () => {
    if (!userId) return;

    // Optimistically update UI
    const isCurrentlyLiked = video.isLiked;
    const currentLikes = video.likes;

    setVideos((prevVideos) =>
      prevVideos.map((v) =>
        v.id === video.id
          ? {
              ...v,
              isLiked: !isCurrentlyLiked,
              likes: isCurrentlyLiked ? currentLikes - 1 : currentLikes + 1,
            }
          : v
      )
    );

    try {
      const response = await fetch(`/api/video/${video.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: isCurrentlyLiked ? "unlike" : "like",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update like status");
      }

      // Only track like events
      if (!isCurrentlyLiked) {
        trackEvent(userId, "like");
      }

      // Server update successful, no need to revert UI
    } catch (error) {
      console.error("Error updating like status:", error);

      // Revert optimistic update on error
      setVideos((prevVideos) =>
        prevVideos.map((v) =>
          v.id === video.id
            ? {
                ...v,
                isLiked: isCurrentlyLiked,
                likes: currentLikes,
              }
            : v
        )
      );

      // Show error to user
      // You might want to add a toast notification here
    }
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
    setShowShareDialog(true);
  };

  const handleCopyLink = async () => {
    const videoUrl = `${window.location.origin}/video/${video.id}`;
    await navigator.clipboard.writeText(videoUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div
        ref={ref}
        className="relative w-full h-[calc(100vh-4rem)] snap-start snap-always flex flex-col items-center py-4 -ml-96"
      >
        {/* Main container with max height for video */}
        <div className="w-full max-w-[360px] aspect-[9/16] relative">
          {/* Video player */}
          <VideoPlayer
            url={video.url}
            playing={isPlaying}
            onPlayPause={onPlayPause}
            handleProgress={handleVideoProgress}
            onEnded={() => onPlayPause(true)}
            className="w-full h-full rounded-lg overflow-hidden"
          />

          {/* Interaction buttons on the right */}
          <div className="absolute -right-24 bottom-20 flex flex-col items-center gap-6">
            <Button
              variant="ghost"
              size="sm"
              className={`flex flex-col items-center gap-1.5 hover:bg-transparent ${
                video.isLiked ? "text-primary" : "text-white"
              } hover:text-primary transition-colors`}
              onClick={handleLike}
            >
              <Heart
                className={`h-7 w-7 ${video.isLiked ? "fill-current" : ""}`}
              />
              <span className="text-xs font-medium">{video.likes}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-1.5 hover:bg-transparent text-white hover:text-primary transition-colors"
              onClick={handleComment}
            >
              <MessageSquare className="h-7 w-7" />
              <span className="text-xs font-medium">Comment</span>
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

        {/* Video info section below */}
        <div className="w-full max-w-[360px] px-4 py-3 -ml-8">
          <div className="flex items-center gap-3 mb-2">
            <Avatar className="h-8 w-8 rounded-full">
              <AvatarImage
                src={avatarUrl}
                alt="avatar"
                className="object-cover rounded-full h-8 w-8"
              />
              <AvatarFallback className="bg-gray-900" />
            </Avatar>
            <div className="min-w-0 flex-1">
              <Link
                href={`/profile/${video.userId}`}
                className="font-semibold text-white text-sm truncate hover:text-primary transition-colors flex items-center"
              >
                @{username}
              </Link>
            </div>
          </div>
          <p className="text-sm text-gray-400 truncate">{video.title}</p>
          <p className="text-sm text-gray-400 line-clamp-2">
            {video.description}
          </p>
        </div>
      </div>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md bg-black text-white">
          <DialogHeader>
            <DialogTitle>Share video</DialogTitle>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/video/${video.id}`}
                className="w-full"
              />
            </div>
            <Button size="icon" onClick={handleCopyLink} className="px-3">
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Debounce utility function with proper typing
function debounce<Args extends unknown[]>(
  func: (...args: Args) => void,
  wait: number
): {
  (...args: Args): void;
  cancel: () => void;
} {
  let timeout: NodeJS.Timeout | null = null;

  const debounced = (...args: Args) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
    }
  };

  return debounced;
}

export function Feed({
  initialVideos,
  initialAvatarUrls,
  initialUsernames,
  mode = "trending",
}: {
  initialVideos: Video[];
  initialAvatarUrls: string[];
  initialUsernames: string[];
  mode?: "trending" | "recommended";
}) {
  const [mounted, setMounted] = React.useState(false);
  const [videos, setVideos] = React.useState<Video[]>(initialVideos);
  const [page, setPage] = React.useState(2);
  const [loading, setLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = React.useState<string | null>(
    null
  );
  const [avatarUrls, setAvatarUrls] =
    React.useState<string[]>(initialAvatarUrls);
  const [usernames, setUsernames] = React.useState<string[]>(initialUsernames);
  // Handle hydration
  React.useEffect(() => {
    setMounted(true);
    setCurrentlyPlaying(initialVideos?.[0]?.id || null);
  }, [initialVideos]);

  const loadMore = React.useCallback(async () => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/video?mode=${mode}&page=${page}&limit=5`,
        {
          cache: "no-store",
        }
      );
      if (!response.ok) throw new Error("Failed to fetch videos");

      const data: ApiResponse & { avatarUrls: string[] } =
        await response.json();

      if (data.videos.length > 0) {
        setVideos((prev) => [...prev, ...data.videos]);
        setPage((prev) => prev + 1);
        if (data.avatarUrls?.length > 0) {
          setAvatarUrls((prev) => [...prev, ...data.avatarUrls]);
        }
        if (data.usernames?.length > 0) {
          setUsernames((prev) => [...prev, ...data.usernames]);
        }
      }
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Error loading videos:", error);
      setError("Failed to load more videos");
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore, mode]);

  // Debounced version of loadMore
  const debouncedLoad = React.useCallback(() => {
    const debouncedFn = debounce(() => loadMore(), 500);
    debouncedFn();
    return debouncedFn.cancel;
  }, [loadMore]);

  // Cleanup
  React.useEffect(() => {
    return () => {
      debouncedLoad();
    };
  }, [debouncedLoad]);

  // Intersection observer
  const { ref: paginationRef, inView } = useInView({
    threshold: 0.5,
    rootMargin: "400px",
  });

  React.useEffect(() => {
    if (inView && !loading && hasMore && mounted) {
      debouncedLoad();
    }
  }, [inView, debouncedLoad, loading, hasMore, mounted]);

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <div className="h-full w-full overflow-y-auto snap-y snap-mandatory">
      <div className="flex flex-col items-center w-full bg-black">
        {videos.map((video, index) => (
          <VideoItem
            key={video.id}
            video={video}
            isPlaying={currentlyPlaying === video.id}
            onVisibilityChange={(inView) => {
              if (inView && mounted) {
                setCurrentlyPlaying(video.id);
              }
            }}
            onPlayPause={(playing) =>
              setCurrentlyPlaying(playing ? video.id : null)
            }
            avatarUrl={avatarUrls[index]}
            username={usernames[index]}
            setVideos={setVideos}
          />
        ))}

        <div
          ref={paginationRef}
          className="w-full flex justify-center p-4 -ml-96"
        >
          {loading && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {!hasMore && <p className="text-gray-500 text-sm">No more videos</p>}
        </div>
      </div>
    </div>
  );
}
