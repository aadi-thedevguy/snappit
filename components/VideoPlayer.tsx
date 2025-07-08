"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { incrementVideoViews } from "@/lib/actions/video";
import { initialVideoState } from "@/constants";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  PictureInPicture2,
  Expand,
  Shrink,
  Loader,
} from "lucide-react";

const ReactPlayer = dynamic(() => import("react-player/lazy"), { ssr: false });

interface VideoPlayerProps {
  videoId: string;
  videoUrl: string;
  initialPlaybackRate?: number;
}

interface VideoPlayerState {
  isLoaded: boolean;
  playbackRate: number;
  isPip: boolean;
  isFullscreen: boolean;
  hasIncrementedView: boolean;
  volume: number;
  isMuted: boolean;
  isPlaying: boolean;
  duration: number;
  played: number;
  seeking: boolean;
  showOverlay: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoId,
  videoUrl,
  initialPlaybackRate = 1,
}) => {
  const [state, setState] = useState<VideoPlayerState>({
    ...initialVideoState,
    playbackRate: initialPlaybackRate,
    isPip: false,
    isFullscreen: false,
    volume: 1,
    isMuted: false,
    isPlaying: false,
    duration: 0,
    played: 0,
    seeking: false,
    showOverlay: false,
  });

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playerRef = useRef<any>(null); // For direct video element access
  const [pipSupported, setPipSupported] = useState(false);

  useEffect(() => {
    setPipSupported(!!document.pictureInPictureEnabled);
  }, []);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    const video = playerRef.current?.getInternalPlayer?.();
    if (video) {
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    }
    setState((prev) => ({
      ...prev,
      isPlaying: !prev.isPlaying,
      showOverlay: true,
    }));
    if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    overlayTimeoutRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, showOverlay: false }));
    }, 1000);
  }, []);

  // Handle progress updates
  const handleProgress = useCallback(
    ({ played }: { played: number }) => {
      if (!state.seeking) {
        setState((prev) => ({ ...prev, played }));
      }
    },
    [state.seeking]
  );

  // Handle seeking
  const handleSeekMouseDown = useCallback(() => {
    setState((prev) => ({ ...prev, seeking: true }));
  }, []);

  const handleSeekChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setState((prev) => ({
        ...prev,
        played: parseFloat(e.target.value),
      }));
    },
    []
  );

  const handleSeekMouseUp = useCallback(
    (e: React.MouseEvent<HTMLInputElement>) => {
      const newPlayed = parseFloat(e.currentTarget.value);
      const video = playerRef.current?.getInternalPlayer?.();
      if (video) {
        video.currentTime = newPlayed * (state.duration || 1);
      }
      setState((prev) => ({
        ...prev,
        played: newPlayed,
        seeking: false,
      }));
    },
    [state.duration]
  );

  // Toggle PiP mode
  const togglePip = useCallback(() => {
    const video = playerRef.current?.getInternalPlayer?.();
    if (video) {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        video.requestPictureInPicture();
      }
    }
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      playerContainerRef.current?.requestFullscreen();
      setState((prev) => ({ ...prev, isFullscreen: true }));
    } else {
      document.exitFullscreen();
      setState((prev) => ({ ...prev, isFullscreen: false }));
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const video = playerRef.current?.getInternalPlayer?.();
    if (video) {
      video.muted = !state.isMuted;
    }
    setState((prev) => ({
      ...prev,
      isMuted: !prev.isMuted,
      volume: prev.isMuted ? prev.volume || 0.5 : 0,
    }));
  }, [state.isMuted]);

  // Handle volume change
  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const volume = parseFloat(e.target.value);
      const video = playerRef.current?.getInternalPlayer?.();
      if (video) {
        video.volume = volume;
        video.muted = volume === 0;
      }
      setState((prev) => ({
        ...prev,
        volume,
        isMuted: volume === 0,
      }));
    },
    []
  );

  // Increment view count when video is loaded and played
  useEffect(() => {
    if (state.isPlaying && state.isLoaded && !state.hasIncrementedView) {
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
  }, [videoId, state.isPlaying, state.isLoaded, state.hasIncrementedView]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={playerContainerRef}
      className="relative w-full max-w-full rounded-xl bg-[#181A20] shadow-lg overflow-hidden aspect-video flex flex-col"
    >
      <Suspense
        fallback={<Loader className="w-10 h-10 text-sky-500 animate-spin" />}
      >
        <div
          className="relative w-full h-full cursor-pointer group"
          onClick={togglePlayPause}
        >
          <ReactPlayer
            ref={playerRef}
            url={videoUrl}
            playing={state.isPlaying}
            loop={false}
            controls={false}
            playsInline
            width="100%"
            height="100%"
            playbackRate={state.playbackRate}
            volume={state.volume}
            muted={state.isMuted}
            onReady={() => setState((prev) => ({ ...prev, isLoaded: true }))}
            onPlay={() => setState((prev) => ({ ...prev, isPlaying: true }))}
            onPause={() => setState((prev) => ({ ...prev, isPlaying: false }))}
            onEnded={() => setState((prev) => ({ ...prev, isPlaying: false }))}
            onProgress={handleProgress}
            onDuration={(duration) =>
              setState((prev) => ({ ...prev, duration }))
            }
            onError={(e) => {
              console.error("Video error:", e);
              setState((prev) => ({ ...prev, isLoaded: false }));
            }}
            onRateChange={(rate: number) => {
              setState((prev) => ({ ...prev, playbackRate: rate }));
            }}
            className="!absolute !top-0 !left-0 !w-full !h-full"
          />

          {/* Overlay play/pause button */}
          <div
            className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-300 z-10 ${state.showOverlay ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-20 h-20 rounded-full flex items-center justify-center bg-black/60 hover:bg-black/80 transition"
              onClick={togglePlayPause}
              aria-label={state.isPlaying ? "Pause" : "Play"}
            >
              {state.isPlaying ? (
                <Pause className="w-14 h-14 text-white" />
              ) : (
                <Play className="w-14 h-14 text-white" />
              )}
            </button>
          </div>

          {/* Custom controls */}
          <div
            className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-8 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress bar */}
            <div className="relative w-full h-2 mb-4 flex items-center">
              <input
                type="range"
                min={0}
                max={0.999999}
                step="any"
                value={state.played}
                onMouseDown={handleSeekMouseDown}
                onChange={handleSeekChange}
                onMouseUp={handleSeekMouseUp}
                className="absolute w-full h-2 opacity-0 cursor-pointer z-10"
              />
              <div className="absolute w-full h-2 bg-[#23262F] rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${state.played * 100}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {/* Play/Pause button */}
                <button
                  className="w-8 h-8 flex items-center justify-center rounded bg-transparent hover:bg-[#23262F] transition"
                  onClick={togglePlayPause}
                  aria-label={state.isPlaying ? "Pause" : "Play"}
                >
                  {state.isPlaying ? (
                    <Pause className="w-6 h-6 text-white" />
                  ) : (
                    <Play className="w-6 h-6 text-white" />
                  )}
                </button>
                {/* Time display */}
                <span className="text-xs text-white font-mono min-w-[60px]">
                  {formatTime(state.played * state.duration)} /{" "}
                  {formatTime(state.duration)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Volume control */}
                <div className="flex items-center gap-1">
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#23262F] transition"
                    onClick={toggleMute}
                    aria-label={state.isMuted ? "Unmute" : "Mute"}
                  >
                    {state.isMuted || state.volume === 0 ? (
                      <VolumeX className="w-5 h-5 text-white" />
                    ) : state.volume < 0.5 ? (
                      <Volume1 className="w-5 h-5 text-white" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-white" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step="any"
                    value={state.volume}
                    onChange={handleVolumeChange}
                    className="w-[70px] h-2 bg-gray-400 rounded cursor-pointer accent-sky-500"
                  />
                </div>
                {/* Playback speed */}
                <select
                  value={state.playbackRate}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      playbackRate: parseFloat(e.target.value),
                    }))
                  }
                  className="bg-gray-500 text-white text-xs rounded px-2 py-1 cursor-pointer outline-none border border-gray-400 hover:bg-gray-600 transition"
                >
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                    <option key={speed} value={speed}>
                      {speed}x
                    </option>
                  ))}
                </select>
                {/* PiP button */}
                {pipSupported && (
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#23262F] transition"
                    onClick={togglePip}
                    aria-label="Picture in Picture"
                  >
                    <PictureInPicture2 className="w-5 h-5 text-white" />
                  </button>
                )}
                {/* Fullscreen button */}
                <button
                  className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#23262F] transition"
                  onClick={toggleFullscreen}
                  aria-label={
                    state.isFullscreen ? "Exit fullscreen" : "Fullscreen"
                  }
                >
                  {state.isFullscreen ? (
                    <Shrink className="w-5 h-5 text-white" />
                  ) : (
                    <Expand className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Suspense>
    </div>
  );
};

// Helper function to format time in seconds to MM:SS or HH:MM:SS
const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "0:00";

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export default VideoPlayer;
