"use client";

import React, {
  Suspense,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { formatDuration } from "@/lib/utils";
import { incrementVideoViews } from "@/lib/actions/video";
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
  SkipBack,
  SkipForward,
} from "lucide-react";
import dynamic from "next/dynamic";

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
    isLoaded: false,
    hasIncrementedView: false,
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
  const volumeContainerRef = useRef<HTMLDivElement>(null);

  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const handleClickOutside = (event: MouseEvent | TouchEvent) => {
    if (
      volumeContainerRef.current &&
      !volumeContainerRef.current.contains(event.target as Node)
    ) {
      setShowVolumeSlider(false);
    }
  };

  useEffect(() => {
    if (!showVolumeSlider) return;
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showVolumeSlider]);

  // Toggle play/pause
  const togglePlayPause = useCallback((e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setState((prev) => {
      const willPlay = !prev.isPlaying;
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
      if (willPlay) {
        overlayTimeoutRef.current = setTimeout(() => {
          setState((prev) => ({ ...prev, showOverlay: false }));
        }, 3000);
      }
      return {
        ...prev,
        isPlaying: willPlay,
        showOverlay: true,
      };
    });
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback((e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!document.fullscreenElement) {
      playerContainerRef.current?.requestFullscreen();
      setState((prev) => ({ ...prev, isFullscreen: true }));
    } else {
      document.exitFullscreen();
      setState((prev) => ({ ...prev, isFullscreen: false }));
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInput =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        (activeElement as HTMLElement)?.isContentEditable;

      if (isInput) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlayPause();
          break;
        case "KeyF":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "ArrowUp":
          e.preventDefault();
          setState((prev) => ({
            ...prev,
            volume: Math.min(1, prev.volume + 0.1),
            isMuted: false,
          }));
          break;
        case "ArrowDown":
          e.preventDefault();
          setState((prev) => ({
            ...prev,
            volume: Math.max(0, prev.volume - 0.1),
            isMuted: false,
          }));
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (playerRef.current) {
            const player = playerRef.current as any;
            const currentTime = player.getCurrentTime
              ? player.getCurrentTime()
              : 0;
            player.seekTo(Math.max(0, currentTime - 10));
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (playerRef.current) {
            const player = playerRef.current as any;
            const currentTime = player.getCurrentTime
              ? player.getCurrentTime()
              : 0;
            player.seekTo(Math.min(duration, currentTime + 10));
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [duration, togglePlayPause, toggleFullscreen]);

  const handleContainerClick = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    togglePlayPause(e);
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
    setState((prevState) => ({
      ...prevState,
      played: Number.parseFloat(inputTarget.value),
    }));
  };

  const skip = (sec: number) => {
    if (!playerRef.current || state.seeking) return;

    const player = playerRef.current as any;
    const currentTime = player.getCurrentTime
      ? player.getCurrentTime()
      : state.playedSeconds;
    const newTime = Math.max(0, Math.min(state.duration, currentTime + sec));

    player.seekTo(newTime);

    setState((prevState) => ({
      ...prevState,
      playedSeconds: newTime,
      played: prevState.duration ? newTime / prevState.duration : 0,
    }));
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
  const togglePip = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setState((prev) => ({
      ...prev,
      isPip: !prev.isPip,
    }));
  };

  // Toggle mute
  const toggleMute = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setState((prev) => ({
      ...prev,
      isMuted: !prev.isMuted,
      volume: prev.isMuted ? prev.volume || 0.5 : 0,
    }));
  };

  // Handle volume change
  const handleVolumeChange = (
    event: React.SyntheticEvent<HTMLInputElement>,
  ) => {
    const inputTarget = event.target as HTMLInputElement;
    setState((prevState) => ({
      ...prevState,
      volume: Number.parseFloat(inputTarget.value),
      isMuted: false,
    }));
  };

  const handleVolumeAction = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.innerWidth < 768) {
      if (showVolumeSlider) {
        toggleMute(e);
      } else {
        setShowVolumeSlider(true);
      }
    } else {
      toggleMute(e);
    }
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
  // Listen for fullscreenchange events to update isFullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setState((prev) => ({
        ...prev,
        isFullscreen: !!document.fullscreenElement,
      }));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
      }
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
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
          className={`relative w-full h-full cursor-pointer group ${
            showVolumeSlider ? "pointer-events-none" : ""
          }`}
          onClick={handleContainerClick}
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
            className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-300 z-10 ${
              state.showOverlay || !state.isPlaying
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <button
              className="w-16 h-16 rounded-full flex items-center justify-center bg-black/60 hover:bg-black/80 transition"
              onClick={togglePlayPause}
              aria-label={state.isPlaying ? "Pause" : "Play"}
            >
              {state.isPlaying ? (
                <Pause className="w-10 h-10 text-white" />
              ) : (
                <Play className="w-10 h-10 text-white" />
              )}
            </button>
          </div>

          {/* Custom controls */}
          <div
            className={`absolute bottom-0 left-0 right-0 px-4 pb-3 pt-8 bg-linear-to-t from-black/80 to-transparent transition-opacity z-20 ${
              state.showOverlay || !state.isPlaying
                ? "opacity-100"
                : "opacity-0 md:group-hover:opacity-100"
            }`}
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
                onTouchStart={handleSeekMouseDown}
                onTouchEnd={handleSeekMouseUp}
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
                  className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded bg-transparent hover:bg-[#23262F] transition"
                  onClick={togglePlayPause}
                  aria-label={state.isPlaying ? "Pause" : "Play"}
                >
                  {state.isPlaying ? (
                    <Pause className="w-4 h-4 md:w-6 md:h-6 text-white" />
                  ) : (
                    <Play className="w-4 h-4 md:w-6 md:h-6 text-white" />
                  )}
                </button>
                {/* Time display */}
                <span className="text-xs text-white font-satoshi min-w-15">
                  {isNaN(state.playedSeconds)
                    ? "00:00"
                    : formatDuration(Math.floor(state.playedSeconds))}{" "}
                  /{" "}
                  {!isFinite(state.duration) || isNaN(state.duration)
                    ? formatDuration(duration)
                    : formatDuration(Math.floor(state.duration))}
                </span>
                {/* Skip */}
                <div className="hidden md:flex items-center gap-2">
                  <button
                    className="bg-transparent hover:bg-[#23262F] transition"
                    onClick={() => skip(-10)}
                  >
                    <SkipBack className="h-5 w-5 text-white" />
                  </button>
                  <button
                    className="bg-transparent hover:bg-[#23262F] transition"
                    onClick={() => skip(10)}
                  >
                    <SkipForward className="h-5 w-5 text-white" />
                  </button>
                </div>
              </div>
              <div className="flex items-center relative gap-2">
                {/* Volume control */}
                <div
                  className="flex items-center gap-1 group/volume pointer-events-auto"
                  ref={volumeContainerRef}
                >
                  <button
                    className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded hover:bg-[#23262F] transition"
                    onClick={handleVolumeAction}
                    aria-label={state.isMuted ? "Unmute" : "Mute"}
                  >
                    {state.isMuted || state.volume === 0 ? (
                      <VolumeX className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    ) : state.volume < 0.5 ? (
                      <Volume1 className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    ) : (
                      <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={state.volume}
                    onChange={handleVolumeChange}
                    className="w-17.5 h-2 bg-gray-400 rounded cursor-pointer accent-sky-500"
                  />
                </div>
                {/* Playback speed */}
                <select
                  value={String(state.playbackRate ?? 1)}
                  onChange={handleRateChange}
                  className="bg-gray-500 hidden md:block text-white text-xs rounded px-2 py-1 cursor-pointer outline-none border border-gray-400 hover:bg-gray-600 transition"
                >
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                    <option key={speed} value={speed}>
                      {speed}x
                    </option>
                  ))}
                </select>
                {/* PiP button */}
                <button
                  className="w-6 h-6 md:w-8 md:h-8 hidden md:flex items-center justify-center rounded hover:bg-[#23262F] transition"
                  onClick={togglePip}
                  aria-label="Picture in Picture"
                >
                  <PictureInPicture2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </button>
                {/* Fullscreen button */}
                <button
                  className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded hover:bg-[#23262F] transition"
                  onClick={toggleFullscreen}
                  aria-label={
                    state.isFullscreen ? "Exit fullscreen" : "Fullscreen"
                  }
                >
                  {state.isFullscreen ? (
                    <Shrink className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  ) : (
                    <Expand className="w-4 h-4 md:w-5 md:h-5 text-white" />
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

export default VideoPlayer;
