/**
 * Generates a thumbnail image from a video file by capturing a frame at 1 second.
 * Returns a Blob (JPEG) or null if it fails.
 */
export function generateThumbnail(
  videoFile: File | Blob,
  timeInSeconds = 1,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(videoFile);
    video.src = url;

    video.onloadeddata = () => {
      video.currentTime = Math.min(
        timeInSeconds,
        video.duration * 0.1 || timeInSeconds,
      );
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(video.videoWidth, 1280);
        canvas.height = Math.round(
          canvas.width * (video.videoHeight / video.videoWidth),
        );
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            resolve(blob);
          },
          "image/jpeg",
          0.85,
        );
      } catch {
        URL.revokeObjectURL(url);
        resolve(null);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
  });
}
