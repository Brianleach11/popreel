import { useCallback, useEffect, useRef } from "react";

interface VideoAnalytics {
  videoId: string;
  userId: string;
  viewStartTime: number;
  liked: boolean;
  commented: boolean;
  shared: boolean;
}

export function useVideoAnalytics(videoId: string) {
  const analyticsRef = useRef<VideoAnalytics | null>(null);
  const isProcessing = useRef(false);

  const sendAnalytics = useCallback(async (analytics: VideoAnalytics) => {
    if (isProcessing.current || !analytics) return;

    try {
      isProcessing.current = true;
      const viewDuration = Math.max(
        1,
        Math.round((Date.now() - analytics.viewStartTime) / 1000)
      ); // Minimum 1 second view duration

      const response = await fetch("/api/analytics/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          events: [
            {
              userId: analytics.userId,
              videoId: analytics.videoId,
              viewDuration,
              liked: analytics.liked,
              commented: analytics.commented,
              shared: analytics.shared,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send analytics");
      }
    } catch (error) {
      console.error("Failed to send analytics:", error);
    } finally {
      isProcessing.current = false;
      analyticsRef.current = null;
    }
  }, []);

  const initializeAnalytics = useCallback(
    (userId: string) => {
      analyticsRef.current = {
        videoId,
        userId,
        viewStartTime: Date.now(),
        liked: false,
        commented: false,
        shared: false,
      };
    },
    [videoId]
  );

  const trackEvent = useCallback(
    (
      userId: string,
      eventType: "view" | "like" | "comment" | "share",
      isStart = false
    ) => {
      if (isStart) {
        // Reset analytics when starting a new view
        initializeAnalytics(userId);
        return;
      }

      if (!analyticsRef.current) {
        // If no current analytics, initialize with the event
        initializeAnalytics(userId);
      }

      switch (eventType) {
        case "like":
          analyticsRef.current!.liked = true;
          break;
        case "comment":
          analyticsRef.current!.commented = true;
          break;
        case "share":
          analyticsRef.current!.shared = true;
          break;
      }
    },
    [initializeAnalytics]
  );

  const finalize = useCallback(() => {
    if (analyticsRef.current) {
      sendAnalytics(analyticsRef.current);
    }
  }, [sendAnalytics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (analyticsRef.current) {
        sendAnalytics(analyticsRef.current);
      }
    };
  }, [sendAnalytics]);

  return { trackEvent, finalize };
}
