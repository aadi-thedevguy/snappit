import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execa } from "execa";
import ffmpegPath from "ffmpeg-static";

// Files belong to one step attempt, never to the entire durable function run.
export async function withMediaDirectory<T>(work: (directory: string) => Promise<T>) {
  const directory = await mkdtemp(join(tmpdir(), "snappit-media-"));
  try {
    return await work(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function runFfmpeg(args: string[], timeout = 600_000) {
  if (!ffmpegPath) throw new Error("FFmpeg is unavailable on this platform");
  try {
    await execa(ffmpegPath, ["-nostdin", "-hide_banner", "-loglevel", "error", "-y", ...args], {
      timeout,
      forceKillAfterDelay: 5_000,
      maxBuffer: 1024 * 1024,
      stdout: "ignore",
    });
  } catch (error) {
    // Do not persist the full command or paths in the public processing error.
    const failure = error as { timedOut?: boolean; stderr?: string };
    throw new Error(failure.timedOut
      ? "FFmpeg exceeded the processing time limit"
      : `FFmpeg failed: ${failure.stderr?.slice(-2000) || "Unable to process media"}`,
    { cause: error });
  }
}

export async function transcodeToMp4(input: string, output: string) {
  await runFfmpeg([
    "-protocol_whitelist", "file,pipe", "-i", input,
    "-map", "0:v:0", "-map", "0:a:0?", "-map_metadata", "-1", "-sn", "-dn",
    "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
    "-pix_fmt", "yuv420p", "-threads", "2",
    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", output,
  ]);
}

