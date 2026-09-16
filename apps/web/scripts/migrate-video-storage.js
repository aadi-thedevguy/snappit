/* Run with Node.js: node scripts/migrate-video-storage.js [--apply] [--delete-old]
 * Preview by default. Stop uploads/Inngest while applying a migration.
 */
// Standalone .js entry point in this CommonJS package.
/* eslint-disable @typescript-eslint/no-require-imports */
const { config } = require("dotenv");
const postgres = require("postgres");
const { S3Client, HeadObjectCommand, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
config({ quiet: true });

const args = new Set(process.argv.slice(2));
if ([...args].some(arg => !["--apply", "--delete-old", "--help"].includes(arg))) {
  throw new Error("Unknown option. Use --help.");
}
if (args.has("--help")) {
  console.log("node scripts/migrate-video-storage.js [--apply] [--delete-old]\nDefault: read-only preview. --apply copies and updates DB. --delete-old also removes old objects AFTER commit. Stop uploads/workers first. Requires DATABASE_URL, S3_BUCKET_NAME and AWS credentials.");
  process.exit(0);
}
const apply = args.has("--apply");
if (args.has("--delete-old") && !apply) throw new Error("--delete-old requires --apply");
if (!process.env.DATABASE_URL || !process.env.S3_BUCKET_NAME) throw new Error("DATABASE_URL and S3_BUCKET_NAME are required");
const Bucket = process.env.S3_BUCKET_NAME;
const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const objectKey = key => key.startsWith("videos/") ? key : `videos/${key}`;

async function inspect(key) {
  if (!key) return null;
  const Key = objectKey(key);
  let head;
  try {
    head = await s3.send(new HeadObjectCommand({ Bucket, Key }));
  } catch (error) {
    if (error.$metadata?.httpStatusCode === 404) return null;
    throw error;
  }
  if (!head.ContentLength) throw new Error(`Empty object: ${Key}`);
  const response = await s3.send(new GetObjectCommand({ Bucket, Key, Range: "bytes=0-63", IfMatch: head.ETag }));
  const bytes = Buffer.from(await response.Body.transformToByteArray());
  const format = bytes.subarray(4, 8).toString() === "ftyp" ? "mp4"
    : bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) ? "webm" : null;
  if (!format) throw new Error(`Unrecognized media container: ${Key}`);
  return { key: Key, head, format };
}

async function firstExisting(keys) {
  for (const key of [...new Set(keys.filter(Boolean))]) {
    const found = await inspect(key);
    if (found) return found;
  }
  return null;
}

async function copyVerified(source, target) {
  const Key = objectKey(target);
  if (source.key === Key) return;
  const existing = await inspect(target);
  if (existing) {
    if (existing.head.ETag !== source.head.ETag || existing.head.ContentLength !== source.head.ContentLength) {
      throw new Error(`Destination already contains a different object: ${Key}`);
    }
    return;
  }
  if (!apply) return;
  if (source.head.ContentLength > 5 * 1024 ** 3) throw new Error("Copy exceeds 5 GiB; multipart copy required");
  const copied = await s3.send(new CopyObjectCommand({
    Bucket, Key,
    CopySource: `${Bucket}/${source.key.split("/").map(encodeURIComponent).join("/")}`,
    CopySourceIfMatch: source.head.ETag,
    MetadataDirective: "COPY",
  }));
  const verified = await inspect(target);
  if (!verified || verified.format !== source.format ||
      verified.head.ContentLength !== source.head.ContentLength ||
      verified.head.ETag !== copied.CopyObjectResult?.ETag) {
    throw new Error(`Copy verification failed: ${Key}`);
  }
}

async function migrate(row, tx) {
  if (row.processing_status === "processing" || row.processing_status === "uploaded") {
    console.log(`${row.video_id}: skipped active/queued pipeline record`);
    return [];
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(row.video_id)) throw new Error("Unsupported video ID");
  const id = row.video_id;
  const legacy = await firstExisting([id, `${id}.webm`, `${id}.mp4`]);
  const raw = await firstExisting([row.raw_video_id, `raw/${id}.webm`, `raw/${id}.mp4`]) || legacy;
  let processed = await firstExisting([row.processed_video_id, `processed/${id}.mp4`]);
  if (processed && processed.format !== "mp4") throw new Error("Processed object is not an MP4");
  if (!processed && legacy?.format === "mp4") processed = legacy;
  if (!raw && !processed) throw new Error("No source objects found; record left unchanged");
  const rawKey = raw ? `raw/${id}.${raw.format}` : null;
  const processedKey = processed ? `processed/${id}.mp4` : null;
  const status = processed ? "ready" : "failed";
  const moves = [];
  if (raw) moves.push([raw, rawKey]);
  if (processed) moves.push([processed, processedKey]);
  for (const [source, target] of moves) await copyVerified(source, target);
  console.log(JSON.stringify({ videoId: id, mode: apply ? "apply" : "preview", copies: moves.map(([source, target]) => ({ from: source.key, to: objectKey(target) })), rawVideoId: rawKey, processedVideoId: processedKey, processingStatus: status }));
  if (apply) {
    await tx`UPDATE snappit_videos SET raw_video_id = ${rawKey}, raw_mime_type = ${raw ? `video/${raw.format}` : null}, processed_video_id = ${processedKey}, processed_mime_type = ${processed ? "video/mp4" : null}, processing_status = ${status}, processing_error = ${processed ? null : "Legacy upload has no processed MP4. Raw playback remains available."}, updated_at = NOW() WHERE id = ${row.id}`;
  }
  const targets = new Set(moves.map(([, target]) => objectKey(target)));
  const sources = [...moves.map(([source]) => source), ...(legacy ? [legacy] : [])];
  return [...new Map(sources.map(source => [source.key, source])).values()].filter(source => !targets.has(source.key));
}

async function main() {
  let failed = 0;
  try {
    const rows = await sql`SELECT * FROM snappit_videos ORDER BY created_at`;
    for (const row of rows) {
      try {
        const obsolete = apply ? await sql.begin(async tx => {
          const [current] = await tx`SELECT * FROM snappit_videos WHERE id = ${row.id} FOR UPDATE`;
          return current ? migrate(current, tx) : [];
        }) : await migrate(row, sql);
        if (apply && args.has("--delete-old")) {
          for (const source of obsolete) {
            await s3.send(new DeleteObjectCommand({ Bucket, Key: source.key, IfMatch: source.head.ETag }));
            console.log(`Deleted old object: ${source.key}`);
          }
        }
      } catch (error) {
        failed++;
        console.error(`${row.video_id}: ${error.message}`);
      }
    }
    console.log(`Finished ${apply ? "migration" : "preview"}: ${rows.length} records checked, ${failed} errors.`);
    if (failed) process.exitCode = 1;
  } finally {
    await sql.end();
    s3.destroy();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
