import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execa } from "execa";
import { NonRetriableError } from "inngest";
import type { WorkerConfig } from "../config.js";

// Files belong to one step attempt, never to the entire durable function run.
export async function withMediaDirectory<T>(
  work: (directory: string) => Promise<T>,
  parent = tmpdir(),
) {
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(join(parent, "snappit-media-"));
  try {
    return await work(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export type MediaConfig = Pick<WorkerConfig, "FFMPEG_PATH" | "FFMPEG_TIMEOUT_MS">;
export async function runFfmpeg(
  args: string[],
  config: MediaConfig,
  execute: typeof execa = execa,
) {
  try {
    await execute(
      config.FFMPEG_PATH,
      ["-nostdin", "-hide_banner", "-loglevel", "error", "-y", ...args],
      {
        timeout: config.FFMPEG_TIMEOUT_MS,
        forceKillAfterDelay: 5_000,
        maxBuffer: 1024 * 1024,
        stdout: "ignore",
      },
    );
  } catch (error) {
    const failure = error as { timedOut?: boolean; stderr?: string };
    if (
      /Invalid data found when processing input|moov atom not found|does not contain any stream|matches no streams/i.test(
        failure.stderr ?? "",
      )
    ) {
      throw new NonRetriableError("Uploaded media is corrupt or unsupported");
    }
    // ENOENT, disk exhaustion, timeouts and other infrastructure failures remain retriable.
    throw new Error(
      failure.timedOut
        ? "FFmpeg exceeded the processing time limit"
        : "FFmpeg failed: Unable to process media",
      { cause: error },
    );
  }
}

export function mp4Arguments(input: string, output: string) {
  return [
    "-protocol_whitelist",
    "file,pipe",
    "-i",
    input,
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-map_metadata",
    "-1",
    "-sn",
    "-dn",
    "-vf",
    "pad=ceil(iw/2)*2:ceil(ih/2)*2",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-threads",
    "2",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    output,
  ];
}
export async function transcodeToMp4(input: string, output: string, config: MediaConfig) {
  await runFfmpeg(mp4Arguments(input, output), config);
}
