"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Monitor,
  Square,
  Pause,
  Play,
  Download,
  Save,
  Circle,
} from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_VIDEO_CONFIG, DEFAULT_RECORDING_CONFIG } from "@/constants";

type RecordingState = "idle" | "recording" | "paused" | "stopped";

export default function Record() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startTimeRef = useRef<number>(0);

  const [state, setState] = useState<RecordingState>("idle");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState("");
  const [timer, setTimer] = useState("0:00");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateTimer = useCallback(() => {
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setDuration(elapsed);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    setTimer(`${m}:${s.toString().padStart(2, "0")}`);
  }, []);

  const startRecording = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: DEFAULT_VIDEO_CONFIG,
        audio: true,
      });

      setStream(displayStream);
      if (videoRef.current) {
        videoRef.current.srcObject = displayStream;
      }

      const mediaRecorder = new MediaRecorder(
        displayStream,
        DEFAULT_RECORDING_CONFIG,
      );

      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setRecordedBlob(blob);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = URL.createObjectURL(blob);
        }
        setState("stopped");
        if (timerRef.current) clearInterval(timerRef.current);
      };

      // Handle user stopping via browser UI
      displayStream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current?.state !== "inactive") {
          mediaRecorderRef.current?.stop();
        }
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(updateTimer, 1000);
      setState("recording");
    } catch (err) {
      if (err instanceof DOMException && err.name !== "NotAllowedError") {
        toast.error("Error", {
          description: "Failed to start recording",
        });
      }
    }
  };

  const pauseRecording = () => {
    mediaRecorderRef.current?.pause();
    if (timerRef.current) clearInterval(timerRef.current);
    setState("paused");
  };

  const resumeRecording = () => {
    mediaRecorderRef.current?.resume();
    startTimeRef.current = Date.now() - duration * 1000;
    timerRef.current = setInterval(updateTimer, 1000);
    setState("recording");
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    stream?.getTracks().forEach((t) => t.stop());
  };

  const downloadRecording = () => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "recording"}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetRecording = () => {
    setRecordedBlob(null);
    setState("idle");
    setDuration(0);
    setTimer("0:00");
    setTitle("");
    if (videoRef.current) {
      videoRef.current.src = "";
      videoRef.current.srcObject = null;
    }
  };

  const captureThumbnail = (
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
  ) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Could not get canvas context");
      return;
    }

    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Create a thumbnail from the canvas
      const thumbnailData = canvas.toDataURL("image/jpeg");

      return thumbnailData;
    } catch (error) {
      console.error("Error generating thumbnail:", error);
    }
  };

  const goToUpload = () => {
    if (!recordedBlob || !videoRef.current || !canvasRef.current) return;

    const url = URL.createObjectURL(recordedBlob);
    let thumbnailData: string | undefined;
    const video = videoRef.current;
    video.src = url;
    setIsRedirecting(true);

    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("Canvas ref not available");
      throw new Error("Canvas element not available");
    }
    setTimeout(() => {
      thumbnailData = captureThumbnail(video, canvas);

      const videoData = {
        url,
        name: "screen-recording.webm",
        type: recordedBlob.type,
        size: recordedBlob.size,
        duration: duration || 0,
        thumbnailUrl: thumbnailData,
      };

      if (!thumbnailData) {
        console.error("Thumbnail not generated");
        return;
      }

      sessionStorage.setItem("recordedVideo", JSON.stringify(videoData));
      router.push("/upload");
      setIsRedirecting(false);
    }, 3000);
  };

  return (
    <div className="container max-w-4xl py-8 px-6 mx-auto">
      <h1 className="text-3xl font-display font-bold text-foreground mb-8">
        Screen Recorder
      </h1>

      {/* Video preview */}
      <Card className="shadow-card border-border overflow-hidden mb-6">
        <div className="aspect-video bg-foreground/5 relative">
          <video
            ref={videoRef}
            autoPlay
            muted={state === "recording" || state === "paused"}
            controls={state === "stopped"}
            className="w-full h-full object-contain"
          />
          {state === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="p-6 rounded-full bg-muted">
                <Monitor className="h-16 w-16 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">
                Click &quot;Start Recording&quot; to capture your screen
              </p>
            </div>
          )}
          {/* Recording indicator */}
          {state === "recording" && (
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive text-destructive-foreground text-sm font-medium">
              <Circle className="h-3 w-3 fill-current recording-pulse" />
              REC {timer}
            </div>
          )}
          {state === "paused" && (
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm font-medium">
              <Pause className="h-3 w-3" />
              PAUSED {timer}
            </div>
          )}
        </div>
      </Card>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
        {state === "idle" && (
          <Button
            onClick={startRecording}
            size="lg"
            className="bg-sky-100 hover:bg-sky-100/80 gap-2 py-6 px-4 rounded-full shadow-elegant"
          >
            <Circle className="h-5 w-5" />
            Start Recording
          </Button>
        )}
        {state === "recording" && (
          <>
            <Button
              onClick={pauseRecording}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <Pause className="h-5 w-5" />
              Pause
            </Button>
            <Button
              onClick={stopRecording}
              variant="destructive"
              size="lg"
              className="gap-2"
            >
              <Square className="h-5 w-5" />
              Stop
            </Button>
          </>
        )}
        {state === "paused" && (
          <>
            <Button
              onClick={resumeRecording}
              size="lg"
              className="gradient-primary text-primary-foreground gap-2"
            >
              <Play className="h-5 w-5" />
              Resume
            </Button>
            <Button
              onClick={stopRecording}
              variant="destructive"
              size="lg"
              className="gap-2"
            >
              <Square className="h-5 w-5" />
              Stop
            </Button>
          </>
        )}
        {state === "stopped" && (
          <>
            <Button
              onClick={resetRecording}
              variant="outline"
              size="lg"
              className="gap-2 px-4 py-6 rounded-full cursor-pointer"
            >
              <Circle className="h-5 w-5" />
              New Recording
            </Button>
            <Button
              onClick={downloadRecording}
              variant="outline"
              size="lg"
              className="px-4 py-6 rounded-full cursor-pointer gap-2 shadow-elegant"
            >
              <Download className="h-5 w-5" />
              Download
            </Button>
          </>
        )}
        {state === "stopped" && (
          <>
            <Button
              onClick={goToUpload}
              disabled={isRedirecting}
              size="lg"
              className="px-4 py-6 rounded-full bg-sky-100 hover:bg-sky-100/80 cursor-pointer gap-2 shadow-elegant"
            >
              <Save className="h-5 w-5" />
              {isRedirecting ? "Saving..." : "Save Recording"}
            </Button>
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </>
        )}
      </div>
    </div>
  );
}
