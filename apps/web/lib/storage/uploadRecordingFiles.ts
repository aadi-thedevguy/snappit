async function putFile(file: Blob, uploadUrl: string, label: "Video" | "Thumbnail") {
  let response: Response;
  try {
    response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": label === "Video" ? "video/webm" : "image/jpeg" },
      body: file,
    });
  } catch {
    // Browser/network errors can contain the signed URL; never surface that URL.
    throw new Error(`${label} upload could not connect. Check your connection and try again.`);
  }
  if (!response.ok) {
    throw new Error(`${label} upload failed (HTTP ${response.status}). Please try again.`);
  }
}

export async function uploadRecordingFiles(
  recording: Blob,
  thumbnail: Blob,
  urls: { rawUploadUrl: string; thumbnailUploadUrl: string },
): Promise<void> {
  // Wait for both requests before allowing a retry, even if one fails first.
  const results = await Promise.allSettled([
    putFile(recording, urls.rawUploadUrl, "Video"),
    putFile(thumbnail, urls.thumbnailUploadUrl, "Thumbnail"),
  ]);
  const errors = results.flatMap((result) =>
    result.status === "rejected" ? [(result.reason as Error).message] : [],
  );
  if (errors.length) throw new Error(errors.join(" "));
}
