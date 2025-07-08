import { useState, useRef, useEffect } from "react";
import {
  getMediaStreams,
  createAudioMixer,
  cleanupRecording,
  createRecordingBlob,
  calculateRecordingDuration,
} from "@/lib/utils";

export function useScreenRecording(
  onRecordingStatusChange?: (status: { type: string; message: string }) => void
) {
  const [state, setState] = useState<BunnyRecordingState>({
    isRecording: false,
    recordedBlob: null,
    recordedVideoUrl: "",
    recordingDuration: 0,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<ExtendedMediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopRecording();
      if (state.recordedVideoUrl) URL.revokeObjectURL(state.recordedVideoUrl);
      if (audioContextRef.current?.state === "running") {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, [state.recordedVideoUrl]);

  const handleRecordingStop = () => {
    const { blob, url } = createRecordingBlob(chunksRef.current);
    const duration = calculateRecordingDuration(startTimeRef.current);

    setState((prev) => ({
      ...prev,
      recordedBlob: blob,
      recordedVideoUrl: url,
      recordingDuration: duration,
      isRecording: false,
    }));
  };

  const startRecording = async (withMic = true) => {
    try {
      stopRecording();

      onRecordingStatusChange?.({
        type: "starting",
        message: "Starting recording...",
      });

      const { displayStream, micStream, hasDisplayAudio } =
        await getMediaStreams(withMic);
      const combinedStream = new MediaStream() as ExtendedMediaStream;

      displayStream
        .getVideoTracks()
        .forEach((track: MediaStreamTrack) => combinedStream.addTrack(track));

      // Add microphone audio if available
      if (micStream) {
        micStream
          .getAudioTracks()
          .forEach((track: MediaStreamTrack) => combinedStream.addTrack(track));
      } else if (withMic) {
        console.warn("Microphone permission denied, proceeding without audio");
        onRecordingStatusChange?.({
          type: "warning",
          message:
            "Microphone permission denied. Recording will continue without audio.",
        });
      }

      // Only set up audio mixer if we have audio
      if (micStream || hasDisplayAudio) {
        audioContextRef.current = new AudioContext();
        const audioDestination = createAudioMixer(
          audioContextRef.current,
          displayStream,
          micStream,
          hasDisplayAudio
        );

        audioDestination?.stream
          .getAudioTracks()
          .forEach((track: MediaStreamTrack) => combinedStream.addTrack(track));
      }

      combinedStream._originalStreams = [
        displayStream,
        ...(micStream ? [micStream] : []),
      ];
      streamRef.current = combinedStream;
      startTimeRef.current = Date.now();

      mediaRecorderRef.current = new MediaRecorder(combinedStream, {
        mimeType: "video/webm",
      });

      mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = handleRecordingStop;

      mediaRecorderRef.current.onstart = () => {
        onRecordingStatusChange?.({
          type: "recording",
          message: "Recording in progress...",
        });
        setState((prev) => ({ ...prev, isRecording: true }));
      };

      mediaRecorderRef.current.start();
      return true;
    } catch (error) {
      console.error("Recording error:", error);
      return false;
    }
  };

  const stopRecording = () => {
    cleanupRecording(
      mediaRecorderRef.current,
      streamRef.current,
      streamRef.current?._originalStreams
    );
    streamRef.current = null;
    setState((prev) => ({ ...prev, isRecording: false }));
  };

  const resetRecording = () => {
    stopRecording();
    if (state.recordedVideoUrl) URL.revokeObjectURL(state.recordedVideoUrl);
    setState({
      isRecording: false,
      recordedBlob: null,
      recordedVideoUrl: "",
      recordingDuration: 0,
    });
    startTimeRef.current = null;
  };

  return {
    ...state,
    startRecording,
    stopRecording,
    resetRecording,
  };
}
