"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/utils";
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
  duration: number;
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
  playedSeconds: number;
  seeking: boolean;
  showOverlay: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoId,
  videoUrl,
  initialPlaybackRate = 1,
  duration,
}) => {
  const [state, setState] = useState<VideoPlayerState>({
    ...initialVideoState,
    playbackRate: initialPlaybackRate,
    isPip: false,
    isFullscreen: false,
    volume: 1,
    isMuted: false,
    isPlaying: false,
    duration,
    played: 0,
    playedSeconds: 0,
    seeking: false,
    showOverlay: false,
  });

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playerRef = useRef<typeof ReactPlayer | null>(null);

  const [pipSupported, setPipSupported] = useState(false);

  useEffect(() => {
    setPipSupported(!!document.pictureInPictureEnabled);
  }, []);

  // Toggle play/pause
  const togglePlayPause = () => {
    setState((prev) => ({
      ...prev,
      isPlaying: !prev.isPlaying,
      showOverlay: true,
    }));
    if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    overlayTimeoutRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, showOverlay: false }));
    }, 1000);
  };

  // Handle progress updates
  const handleProgress = () => {
    if (!playerRef.current || state.seeking) return;
    const internalPlayer = (playerRef.current as any).getInternalPlayer?.();
    const currentTime = internalPlayer?.currentTime ?? 0;
    setState((prevState) => ({
      ...prevState,
      playedSeconds: currentTime,
      played: state.duration ? currentTime / state.duration : 0,
    }));
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  const newRate = Number(e.target.value);
  if (!Number.isFinite(newRate) || newRate <= 0) return; // Prevent invalid rates
  setState((prevState) => ({ ...prevState, playbackRate: newRate }));

};

  const handleTimeUpdate = () => {
    if (!playerRef.current || state.seeking) return;
    const internalPlayer = (playerRef.current as any).getInternalPlayer?.();
    const currentTime = internalPlayer?.currentTime ?? 0;
    setState((prevState) => ({
      ...prevState,
      playedSeconds: currentTime,
      played: state.duration ? currentTime / state.duration : 0,
    }));
  };

  // Handle seeking
  const handleSeekMouseDown = () => {
    setState((prevState) => ({ ...prevState, seeking: true }));
  };

  const handleSeekChange = (event: React.SyntheticEvent<HTMLInputElement>) => {
    const inputTarget = event.target as HTMLInputElement;
    setState((prevState) => ({ ...prevState, played: Number.parseFloat(inputTarget.value) }));
  };

  const handleSeekMouseUp = (event: React.SyntheticEvent<HTMLInputElement>) => {
    const inputTarget = event.target as HTMLInputElement;
    setState((prevState) => ({ ...prevState, seeking: false }));
    if (playerRef.current) {
      const internalPlayer = (playerRef.current as any).getInternalPlayer?.();
      const seekTo = Number.parseFloat(inputTarget.value) * state.duration;
      if (internalPlayer) {
        internalPlayer.currentTime = seekTo;
      }
    }
  };

  // Toggle PiP mode
  const togglePip = () => {
    setState((prev) => ({
      ...prev,
      isPip: !prev.isPip,
    }));
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerContainerRef.current?.requestFullscreen();
      setState((prev) => ({ ...prev, isFullscreen: true }));
    } else {
      document.exitFullscreen();
      setState((prev) => ({ ...prev, isFullscreen: false }));
    }
  };

  // Toggle mute
  const toggleMute = () => {
    setState((prev) => ({
      ...prev,
      isMuted: !prev.isMuted,
      volume: prev.isMuted ? prev.volume || 0.5 : 0,
    }));
  };

  // Handle volume change
  const handleVolumeChange = (event: React.SyntheticEvent<HTMLInputElement>) => {
    const inputTarget = event.target as HTMLInputElement;
    setState((prevState) => ({ ...prevState, volume: Number.parseFloat(inputTarget.value) }));
  };

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

  // Listen for fullscreenchange events to update isFullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setState((prev) => ({ ...prev, isFullscreen: !!document.fullscreenElement }));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
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
            pip={state.isPip}
            playbackRate={state.playbackRate}
            volume={state.volume}
            muted={state.isMuted}
            onReady={() => setState((prev) => ({ ...prev, isLoaded: true }))}
            onPlay={() => setState((prev) => ({ ...prev, isPlaying: true }))}
            onPause={() => setState((prev) => ({ ...prev, isPlaying: false }))}
            onEnded={() => setState((prev) => ({ ...prev, isPlaying: false }))}
            onProgress={handleProgress}
            onRateChange={handleRateChange}
            onTimeUpdate={handleTimeUpdate}
            onError={(e) => {
              console.error("Video error:", e);
              setState((prev) => ({ ...prev, isLoaded: false }));
            }}
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
                value={isNaN(state.played) ? "00:00" : `${state.played}`}
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
                  {isNaN(state.playedSeconds) ? "00:00" : formatDuration(Math.floor(state.playedSeconds))} / {(!isFinite(state.duration) || isNaN(state.duration)) ? formatDuration(duration) : formatDuration(Math.floor(state.duration))}
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
                    step={0.01}
                    value={state.volume}
                    onChange={handleVolumeChange}
                    className="w-[70px] h-2 bg-gray-400 rounded cursor-pointer accent-sky-500"
                  />
                </div>
                {/* Playback speed */}
                <select
                  value={String(state.playbackRate ?? 1)}
                  onChange={handleRateChange}
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
// const formatTime = (seconds: number) => {
//   if (isNaN(seconds)) return "0:00";

//   const h = Math.floor(seconds / 3600);
//   const m = Math.floor((seconds % 3600) / 60);
//   const s = Math.floor(seconds % 60);

//   if (h > 0) {
//     return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
//   }
//   return `${m}:${s.toString().padStart(2, "0")}`;
// };

export default VideoPlayer;
