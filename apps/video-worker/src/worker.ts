import { createServer } from "node:http";
import { hostname } from "node:os";
import { access, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import { connect, ConnectionState, type WorkerConnection } from "inngest/connect";
import { createInngestClient } from "@snappit/inngest";
import { readConfig } from "./config.js";
import { createServices } from "./services.js";
import { createTranscodeVideoToMp4 } from "./functions/transcode-video-to-mp4.js";

async function main() {
  const config = readConfig(process.env);
  await access(config.FFMPEG_PATH, constants.X_OK);
  await mkdir(config.MEDIA_TEMP_DIRECTORY, { recursive: true });
  await access(config.MEDIA_TEMP_DIRECTORY, constants.W_OK);
  const services = createServices(config);
  const client = createInngestClient({
    appId: "snappit-video-worker",
    appVersion: config.APP_VERSION,
    eventKey: config.INNGEST_EVENT_KEY,
    signingKey: config.INNGEST_SIGNING_KEY,
    isDev: config.INNGEST_DEV === "1",
    env: config.INNGEST_ENV,
  });
  let connection: WorkerConnection | undefined;
  const server = createServer((request, response) => {
    if (request.url !== "/ready") {
      response.writeHead(404).end("Not found");
      return;
    }
    const ready = connection?.state === ConnectionState.ACTIVE;
    response.writeHead(ready ? 200 : 503, { "content-type": "text/plain" });
    response.end(ready ? "OK" : "NOT READY");
  });
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(config.HEALTH_PORT, "0.0.0.0", () => {
        server.off("error", reject);
        resolve();
      });
    });
    // The SDK drains in-flight steps on SIGTERM/SIGINT before closed resolves.
    connection = await connect({
      apps: [{ client, functions: [createTranscodeVideoToMp4(client, services)] }],
      instanceId: config.WORKER_INSTANCE_ID ?? hostname(),
      maxWorkerConcurrency: config.WORKER_CONCURRENCY,
    });
    console.info("Video worker connected", {
      appVersion: config.APP_VERSION,
      concurrency: config.WORKER_CONCURRENCY,
    });
    await connection.closed;
  } finally {
    try {
      await connection?.close();
    } finally {
      try {
        if (server.listening)
          await new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          );
      } finally {
        await services.close();
      }
    }
  }
}

main().catch((error) => {
  // Startup errors can contain connection strings; log only validated config errors by value.
  console.error(
    "Video worker failed",
    error instanceof Error && error.message.startsWith("Invalid worker configuration:")
      ? error.message
      : { name: error instanceof Error ? error.name : "UnknownError" },
  );
  process.exitCode = 1;
});
