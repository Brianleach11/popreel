"use client";

import * as React from "react";
import ReactPlayer from "react-player";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// Separate the video-specific props from HTML div props
interface VideoSpecificProps {
  url: string;
  handleProgress?: (state: { played: number; playedSeconds: number }) => void;
  onEnded?: () => void;
  playing?: boolean;
  muted?: boolean;
  onPlayPause?: (playing: boolean) => void;
}

// Combine with HTML div props, excluding conflicting prop names
interface VideoPlayerProps
  extends VideoSpecificProps,
    Omit<React.HTMLAttributes<HTMLDivElement>, keyof VideoSpecificProps> {}

export function VideoPlayer({
  url,
  handleProgress, // renamed from onProgress
  onEnded,
  playing = true, // default to true for autoplay
  muted = true,
  onPlayPause,
  className,
  ...props
}: VideoPlayerProps) {
  const [isBuffering, setIsBuffering] = React.useState(true);
  const [progress, setProgress] = React.useState(0);
  const [seeking, setSeeking] = React.useState(false);
  const playerRef = React.useRef<ReactPlayer>(null);

  const handleVideoProgress = (state: {
    played: number;
    playedSeconds: number;
  }) => {
    if (!seeking) {
      setProgress(state.played);
      handleProgress?.(state);
    }
  };

  const handleSeekMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation(); // Prevent click from triggering play/pause
    setSeeking(true);
  };

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation(); // Prevent click from triggering play/pause
    setSeeking(false);
    const rect = e.currentTarget.getBoundingClientRect();
    const seekPosition = (e.clientX - rect.left) / rect.width;
    playerRef.current?.seekTo(seekPosition);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only toggle play/pause if not clicking progress bar
    if (!(e.target as HTMLElement).closest(".progress-bar")) {
      onPlayPause?.(!playing);
    }
  };

  return (
    <div
      className={cn(
        "relative aspect-[9/16] w-full max-h-[calc(100vh-8rem)] cursor-pointer overflow-hidden",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      <ReactPlayer
        ref={playerRef}
        url={url}
        width="100%"
        height="100%"
        playing={playing}
        muted={muted}
        loop={true}
        onProgress={handleVideoProgress}
        onEnded={onEnded}
        onBuffer={() => setIsBuffering(true)}
        onBufferEnd={() => setIsBuffering(false)}
        onReady={() => setIsBuffering(false)}
        style={{ position: "absolute", top: 0, left: 0 }}
        playsinline // Important for mobile
        config={{
          file: {
            attributes: {
              style: {
                width: "100%",
                height: "100%",
                objectFit: "cover",
              },
            },
          },
        }}
      />

      {/* Loading Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Progress Bar */}
      <div
        className="progress-bar absolute bottom-0 left-0 right-0 h-0.5 bg-gray-800/50 cursor-pointer group"
        onMouseDown={handleSeekMouseDown}
        onMouseUp={handleSeekMouseUp}
      >
        <div
          className="absolute h-full bg-primary transition-all duration-100 group-hover:bg-primary/80"
          style={{ width: `${progress * 100}%` }}
        />
        <div className="absolute bottom-full left-0 right-0 h-8 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}
