"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useScreenRecording } from "@/lib/hooks/useScreenRecording";
import { Loader2, Upload, VideoIcon, VideoOffIcon, X } from "lucide-react";

const RecordScreen = () => {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const {
    isRecording,
    recordedBlob,
    recordedVideoUrl,
    recordingDuration,
    startRecording,
    stopRecording,
    resetRecording,
  } = useScreenRecording();

  const recordAgain = async () => {
    resetRecording();
    await startRecording();
    if (recordedVideoUrl && videoRef.current)
      videoRef.current.src = recordedVideoUrl;
  };

  const captureThumbnail = (
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement
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

  const closeModal = () => {
    resetRecording();
    setIsOpen(false);
  };

  const handleStart = async () => {
    await startRecording();
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
        duration: recordingDuration || 0,
        thumbnailUrl: thumbnailData,
      };

      if (!thumbnailData) {
        console.error("Thumbnail not generated");
        return;
      }

      sessionStorage.setItem("recordedVideo", JSON.stringify(videoData));
      router.push("/upload");
      closeModal();
      setIsRedirecting(false);
    }, 3000);
  };

  return (
    <div className="record">
      <button onClick={() => setIsOpen(true)} className="primary-btn">
        <VideoIcon className="w-5 h-5 text-white" />
        <span className="truncate">Record a video</span>
      </button>

      {isOpen && (
        <section className="dialog">
          <div className="overlay-record" onClick={closeModal} />
          <div className="dialog-content">
            <figure>
              <h3>Screen Recording</h3>
              <button onClick={closeModal}>
                <X className="w-5 h-5" />
              </button>
            </figure>

            <section>
              {isRecording ? (
                <article>
                  <div />
                  <span>Recording in progress...</span>
                </article>
              ) : recordedVideoUrl ? (
                <video ref={videoRef} src={recordedVideoUrl} controls />
              ) : (
                <p>Click record to start capturing your screen</p>
              )}
            </section>

            <div className="record-box">
              {!isRecording && !recordedVideoUrl && (
                <button onClick={handleStart} className="record-start">
                  <VideoIcon className="w-4 h-4 text-white" />
                  Record
                </button>
              )}
              {isRecording && (
                <button onClick={stopRecording} className="record-stop">
                  <VideoOffIcon className="w-4 h-4 text-white" />
                  Stop Recording
                </button>
              )}
              {recordedVideoUrl && (
                <>
                  <button onClick={recordAgain} className="record-again">
                    Record Again
                  </button>
                  <button
                    onClick={goToUpload}
                    disabled={isRedirecting}
                    className="record-upload"
                  >
                    {isRedirecting ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 text-white" />
                    )}
                    {isRedirecting ? "Uploading..." : "Continue to Upload"}
                  </button>
                  {/* Hidden canvas for thumbnail generation */}
                  <canvas ref={canvasRef} style={{ display: "none" }} />
                </>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default RecordScreen;
