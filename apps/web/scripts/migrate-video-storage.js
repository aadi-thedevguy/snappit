/*
 * Move legacy/root video objects into the UUID/user-namespaced layout.
 * Preview by default. --apply copies and verifies objects before updating rows.
 * --delete-old removes known source objects only after the row update commits.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { config } = require("dotenv");
const postgres = require("postgres");
const {
  S3Client,
  HeadObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} = require("@aws-sdk/client-s3");
config({ quiet: true });

const args = new Set(process.argv.slice(2));
if ([...args].some((arg) => !["--apply", "--delete-old", "--help"].includes(arg))) {
  throw new Error("Unknown option. Use --help.");
}
if (args.has("--delete-old") && !args.has("--apply")) {
  throw new Error("--delete-old requires --apply");
}
if (args.has("--help")) {
  console.log(
    "node scripts/migrate-video-storage.js [--apply] [--delete-old]\n" +
      "Default: read-only preview. --apply copies verified objects and updates database keys. " +
      "--delete-old removes only matched legacy source objects after the DB update. " +
      "Requires DATABASE_URL, S3_BUCKET_NAME and AWS credentials. Apply the Drizzle migration first.",
  );
  process.exit(0);
}
if (!process.env.DATABASE_URL || !process.env.S3_BUCKET_NAME) {
  throw new Error("DATABASE_URL and S3_BUCKET_NAME are required");
}

const apply = args.has("--apply");
const deleteOld = args.has("--delete-old");
const Bucket = process.env.S3_BUCKET_NAME;
const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

function legacyObjectKey(key) {
  if (!key) return null;
  return key.startsWith("videos/") ? key : `videos/${key}`;
}

async function inspect(key) {
  if (!key) return null;
  let head;
  try {
    head = await s3.send(new HeadObjectCommand({ Bucket, Key: key }));
  } catch (error) {
    if (error.$metadata?.httpStatusCode === 404 || error.name === "NotFound") return null;
    throw error;
  }
  if (!head.ContentLength) throw new Error(`Empty S3 object: ${key}`);
  const response = await s3.send(
    new GetObjectCommand({
      Bucket,
      Key: key,
      Range: "bytes=0-63",
      IfMatch: head.ETag,
    }),
  );
  const bytes = Buffer.from(await response.Body.transformToByteArray());
  const format =
    bytes.subarray(4, 8).toString() === "ftyp"
      ? "mp4"
      : bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
        ? "webm"
        : null;
  return format ? { key, head, format } : null;
}

async function findFirst(keys, format) {
  for (const key of [...new Set(keys.filter(Boolean))]) {
    const found = await inspect(key);
    if (found?.format === format) return found;
  }
  return null;
}

async function inspectThumbnail(key) {
  if (!key) return null;
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket, Key: key }));
    if (!head.ContentLength || head.ContentType?.split(";")[0] !== "image/jpeg") return null;
    const response = await s3.send(
      new GetObjectCommand({
        Bucket,
        Key: key,
        Range: "bytes=0-2",
        IfMatch: head.ETag,
      }),
    );
    const bytes = Buffer.from(await response.Body.transformToByteArray());
    if (bytes.length < 3 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff)
      return null;
    return { key, head };
  } catch (error) {
    if (error.$metadata?.httpStatusCode === 404 || error.name === "NotFound") return null;
    throw error;
  }
}

async function copyVerified(source, target, { format, contentType, tags } = {}) {
  if (!source || source.key === target) return;
  const existing = format ? await inspect(target) : await inspectThumbnail(target);
  if (existing) {
    const sameFormat = format ? existing.format === format : true;
    if (!sameFormat || existing.head.ContentLength !== source.head.ContentLength) {
      throw new Error(`Destination already contains a different object: ${target}`);
    }
    return;
  }
  if (!apply) return;
  if (source.head.ContentLength > 5 * 1024 ** 3) {
    throw new Error(`Copy exceeds 5 GiB; multipart copy required for ${source.key}`);
  }
  const copySource = `${Bucket}/${source.key.split("/").map(encodeURIComponent).join("/")}`;
  await s3.send(
    new CopyObjectCommand({
      Bucket,
      Key: target,
      CopySource: copySource,
      CopySourceIfMatch: source.head.ETag,
      MetadataDirective: "COPY",
      ...(contentType ? { ContentType: contentType } : {}),
      ...(contentType ? { MetadataDirective: "REPLACE" } : {}),
      ...(tags ? { TaggingDirective: "REPLACE", Tagging: tags } : {}),
    }),
  );
  const verified = format ? await inspect(target) : await inspectThumbnail(target);
  if (
    !verified ||
    (format && verified.format !== format) ||
    verified.head.ContentLength !== source.head.ContentLength
  ) {
    throw new Error(`Copy verification failed: ${target}`);
  }
}

function directCandidates(legacyId, suffixes) {
  if (!legacyId) return [];
  return suffixes.flatMap((suffix) => {
    const name = suffix ? `${legacyId}${suffix}` : legacyId;
    return [name, `videos/${name}`];
  });
}

async function migrate(row, tx, keyHelpers) {
  const { getRawVideoStorageKey, getProcessedVideoStorageKey, getThumbnailStorageKey } = keyHelpers;
  const legacyId = row.video_id;
  const rawTarget = getRawVideoStorageKey(row.user_id, row.id);
  const processedTarget = getProcessedVideoStorageKey(row.user_id, row.id);
  const thumbnailTarget = getThumbnailStorageKey(row.user_id, row.id);

  const rawCandidates = [
    row.raw_storage_key,
    row.raw_video_id ? legacyObjectKey(row.raw_video_id) : null,
    ...(legacyId
      ? [
          `videos/raw/${legacyId}.webm`,
          `raw/${legacyId}.webm`,
          ...directCandidates(legacyId, [".webm", ""]),
        ]
      : []),
  ];
  const processedCandidates = [
    row.processed_storage_key,
    row.processed_video_id ? legacyObjectKey(row.processed_video_id) : null,
    ...(legacyId
      ? [
          `videos/processed/${legacyId}.mp4`,
          `processed/${legacyId}.mp4`,
          ...directCandidates(legacyId, [".mp4"]),
        ]
      : []),
  ];
  const raw = await findFirst(rawCandidates, "webm");
  const processed = await findFirst(processedCandidates, "mp4");
  const thumbnailSourceKey =
    row.thumbnail_storage_key ??
    (row.thumbnail_id
      ? row.thumbnail_id.startsWith("thumbnails/")
        ? row.thumbnail_id
        : `thumbnails/${row.thumbnail_id}`
      : null);
  const thumbnail = await inspectThumbnail(thumbnailSourceKey);

  if (!raw && !processed && !thumbnail) {
    console.log(JSON.stringify({ videoId: row.id, status: "no-matching-objects" }));
    return [];
  }

  const moves = [];
  if (raw)
    moves.push({
      source: raw,
      target: rawTarget,
      format: "webm",
      contentType: "video/webm",
      tags: "snappit-kind=raw",
    });
  if (processed)
    moves.push({
      source: processed,
      target: processedTarget,
      format: "mp4",
      contentType: "video/mp4",
    });
  if (thumbnail)
    moves.push({
      source: thumbnail,
      target: thumbnailTarget,
      contentType: "image/jpeg",
    });
  for (const move of moves) {
    await copyVerified(move.source, move.target, move);
  }

  console.log(
    JSON.stringify({
      videoId: row.id,
      userId: row.user_id,
      mode: apply ? "apply" : "preview",
      objects: moves.map(({ source, target, format, contentType }) => ({
        from: source.key,
        to: target,
        format: format ?? contentType,
      })),
    }),
  );

  if (apply) {
    const rawStorageKey = raw ? rawTarget : row.raw_storage_key;
    const processedStorageKey = processed ? processedTarget : row.processed_storage_key;
    const thumbnailStorageKey = thumbnail ? thumbnailTarget : row.thumbnail_storage_key;
    await tx`UPDATE snappit_videos
      SET raw_storage_key = ${rawStorageKey},
          processed_storage_key = ${processedStorageKey},
          thumbnail_storage_key = ${thumbnailStorageKey},
          raw_mime_type = ${raw ? "video/webm" : row.raw_mime_type},
          processed_mime_type = ${processed ? "video/mp4" : row.processed_mime_type},
          updated_at = NOW()
      WHERE id = ${row.id} AND user_id = ${row.user_id}`;
  }

  const targets = new Set(moves.map((move) => move.target));
  return moves.map((move) => move.source).filter((source) => !targets.has(source.key));
}

async function listUntrackedDirectVideoObjects(trackedSources) {
  const tracked = new Set(trackedSources);
  const direct = [];
  let continuationToken;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket,
        ContinuationToken: continuationToken,
      }),
    );
    for (const item of page.Contents ?? []) {
      const key = item.Key ?? "";
      if (!key.includes("/") && /\.(webm|mp4)$/i.test(key) && !tracked.has(key)) direct.push(key);
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
  return direct;
}

async function main() {
  let failures = 0;
  const oldObjects = [];
  const keyHelpers = await import("@snappit/video-storage/keys");
  try {
    const rows = await sql`SELECT * FROM snappit_videos ORDER BY created_at`;
    for (const row of rows) {
      try {
        const obsolete = apply
          ? await sql.begin(async (tx) => {
              const [current] =
                await tx`SELECT * FROM snappit_videos WHERE id = ${row.id} FOR UPDATE`;
              return current ? migrate(current, tx, keyHelpers) : [];
            })
          : await migrate(row, sql, keyHelpers);
        oldObjects.push(...obsolete);
        if (apply && deleteOld) {
          for (const object of obsolete) {
            await s3.send(
              new DeleteObjectCommand({
                Bucket,
                Key: object.key,
                IfMatch: object.head.ETag,
              }),
            );
            console.log(`Deleted old object after verified copy: ${object.key}`);
          }
        }
      } catch (error) {
        failures++;
        console.error(`videoId ${row.id}: ${error.message}`);
      }
    }
    const untracked = await listUntrackedDirectVideoObjects(oldObjects.map((object) => object.key));
    console.log(
      JSON.stringify(
        {
          summary: apply ? "apply" : "preview",
          records: rows.length,
          failedRecords: failures,
          untrackedDirectVideoObjects: untracked,
          oldObjectsDeleted: apply && deleteOld,
        },
        null,
        2,
      ),
    );
    if (failures) process.exitCode = 1;
  } finally {
    await sql.end();
    s3.destroy();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
