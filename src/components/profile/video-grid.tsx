"use client";

import * as React from "react";
import { Trash2, Play, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Video } from "@/components/feed/feed";

interface VideoGridProps {
  videos: Video[];
  isReadOnly?: boolean;
}

export function VideoGrid({
  videos: initialVideos,
  isReadOnly = false,
}: VideoGridProps) {
  const [videos, setVideos] = React.useState<Video[]>(initialVideos);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const previewRefs = React.useRef<{ [key: string]: HTMLVideoElement | null }>(
    {}
  );

  const router = useRouter();

  const handleDelete = async (videoId: string) => {
    try {
      setDeletingId(videoId);
      const response = await fetch(`/api/video/${videoId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete video");
      }

      setVideos(videos.filter((video) => video.id !== videoId));
      toast.success("Video deleted successfully");
      router.refresh();
    } catch (error) {
      console.error("Error deleting video:", error);
      toast.error("Failed to delete video");
    } finally {
      setDeletingId(null);
    }
  };

  const handleVideoLoad = (videoId: string) => {
    const videoElement = previewRefs.current[videoId];
    if (videoElement) {
      // Set the current time to 0 to show the first frame
      videoElement.currentTime = 0;
    }
  };

  return (
    <div className="relative z-10 pt-16">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {videos.map((video) => (
          <div
            key={video.id}
            className="group relative rounded-lg overflow-hidden border border-gray-800 bg-gray-900/50 backdrop-blur-sm"
          >
            <a href={video.url} className="block relative aspect-[9/16]">
              <video
                ref={(el) => {
                  previewRefs.current[video.id] = el;
                }}
                src={video.url}
                className="object-cover w-full h-full"
                onLoadedData={() => handleVideoLoad(video.id)}
                muted
                playsInline
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Play className="h-12 w-12 text-white" />
              </div>
            </a>
            <div className="p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm line-clamp-1 text-gray-200">
                    {video.title}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(video.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                {!isReadOnly && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-500/10"
                        disabled={deletingId === video.id}
                      >
                        {deletingId === video.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-gray-900/95 backdrop-blur-sm border border-gray-800">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">
                          Delete Video
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                          Are you sure you want to delete this video? This
                          action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-gray-800/90 text-white hover:bg-gray-700">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(video.id)}
                          className="bg-red-500/90 text-white hover:bg-red-600"
                          disabled={deletingId === video.id}
                        >
                          {deletingId === video.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            "Delete"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
