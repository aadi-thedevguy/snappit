import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { access, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Upload } from "@aws-sdk/lib-storage";
import { GetObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { createRenderer } from "../src/services.js";
import { readConfig } from "../src/config.js";

test("renderer downloads, encodes, uploads and cleans inside one attempt", async () => {
  const parent = await mkdtemp(join(tmpdir(), "snappit-test-"));
  const config = readConfig({
    DATABASE_URL: "postgresql://test@localhost/test",
    S3_BUCKET_NAME: "test",
    AWS_REGION: "us-east-1",
    APP_VERSION: "test",
    INNGEST_DEV: "1",
    MEDIA_TEMP_DIRECTORY: parent,
  });
  const calls: string[] = [];
  const client = {
    config: {},
    send: async (command: GetObjectCommand) => {
      assert.ok(command instanceof GetObjectCommand);
      assert.equal(command.input.Key, "videos/raw/video-1.webm");
      calls.push("download");
      return { ContentLength: 4, Body: Readable.from(Buffer.from("webm")) };
    },
  } as unknown as S3Client;
  const upload = mock.method(Upload.prototype, "done", async () => {
    calls.push("upload");
    return {};
  });
  let inputPath = "";
  const encode = async (input: string, output: string) => {
    inputPath = input;
    assert.equal(await readFile(input, "utf8"), "webm");
    calls.push("encode");
    await writeFile(output, "mp4");
  };
  try {
    const render = createRenderer(config, { client, bucket: "test", close() {} }, encode);
    const result = await render("raw/video-1.webm", "processed/video-1.mp4");
    assert.equal(result.storageKey, "processed/video-1.mp4");
    assert.deepEqual(calls, ["download", "encode", "upload"]);
    await assert.rejects(access(inputPath));
    assert.deepEqual(await readdir(parent), []);
    upload.mock.mockImplementation(async () => {
      throw new Error("S3 unavailable");
    });
    await assert.rejects(render("raw/video-1.webm", "processed/video-1.mp4"), /S3 unavailable/);
    assert.deepEqual(await readdir(parent), []);
  } finally {
    upload.mock.restore();
    await rm(parent, { recursive: true, force: true });
  }
});
