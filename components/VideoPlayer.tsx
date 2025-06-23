"use client";

import React from "react";
import ReactPlayer from "react-player";
import { useEffect, useState } from "react";
import { incrementVideoViews } from "@/lib/actions/video";
import { initialVideoState } from "@/constants";

interface VideoPlayerState {
  isLoaded: boolean;
  hasIncrementedView: boolean;
  playbackRate: number;
  isPip: boolean;
  isFullscreen: boolean;
}

interface VideoPlayerProps {
  videoId: string;
  videoUrl: string;
  initialPlaybackRate?: number;
}

const VideoPlayer = ({
  videoId,
  videoUrl,
  initialPlaybackRate = 1,
}: VideoPlayerProps) => {
  const [state, setState] = useState<VideoPlayerState>({
    ...initialVideoState,
    playbackRate: initialPlaybackRate,
    isPip: false,
    isFullscreen: false,
    // muted: true,
  });

  useEffect(() => {
    if (state.isLoaded && !state.hasIncrementedView) {
      const incrementView = async () => {
        try {
          await incrementVideoViews(videoId);
          setState((prev) => ({ ...prev, hasIncrementedView: true }));
        } catch (error) {
          console.error("Failed to increment view count:", error);
        }
      };

      incrementView();
    }
  }, [videoId, state.isLoaded, state.hasIncrementedView]);

  return (
    <div>
      <ReactPlayer
        url={videoUrl}
        controls
        playsInline
        controlsList="nodownload"
        loading="lazy"
        title="Video player"
        width="100%"
        height="100%"
        onLoadedMetadata={() =>
          setState((prev) => ({ ...prev, isLoaded: true }))
        }
        onPlay={() => {
          if (!state.hasIncrementedView) {
            incrementVideoViews(videoId).catch(console.error);
            setState((prev) => ({ ...prev, hasIncrementedView: true }));
          }
        }}
        onRateChange={(e: React.SyntheticEvent<HTMLVideoElement>) => {
          const video = e.target as HTMLVideoElement;
          setState((prev) => ({ ...prev, playbackRate: video.playbackRate }));
        }}
        onError={(e: React.SyntheticEvent<HTMLVideoElement>) => {
          const video = e.target as HTMLVideoElement;
          console.error(
            "Video error:",
            video.error?.code,
            video.error?.message
          );
          setState((prev) => ({ ...prev, isLoaded: false }));
        }}
        onCanPlay={() => {
          console.log("Video can play");
        }}
        onWaiting={() => {
          console.log("Video waiting for more data");
        }}
        onEnded={() => {
          console.log("Video ended");
        }}
        onContextMenu={(e: React.MouseEvent) => e.preventDefault()} // Prevent right-click menu
        preload="auto"
        playbackRate={state.playbackRate}
      />

      {/* <div className="controls-container">
        <div className="speed-controls">
          <button
            onClick={() => {
              setState((prev) => ({
                ...prev,
                playbackRate: Math.max(0.5, prev.playbackRate - 0.25),
              }));
            }}
            title="Slower"
            className="speed-button"
          >
            -
          </button>
          <span className="speed-value">{state.playbackRate}</span>
          <button
            onClick={() => {
              setState((prev) => ({
                ...prev,
                playbackRate: Math.min(2.0, prev.playbackRate + 0.25),
              }));
            }}
            title="Faster"
            className="speed-button"
          >
            +
          </button>
        </div>

        <div className="flex gap-4">
          {!state.isPip && (
            <button
              onClick={() => {
                setState((prev) => ({
                  ...prev,
                  isPip: true,
                }));
              }}
              className="pip-button"
              title="Toggle Picture-in-Picture"
            >
              PiP
            </button>
          )}
        </div>
      </div> */}
    </div>
  );
};

export default VideoPlayer;
