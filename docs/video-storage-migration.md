# Video object storage migration

The application now uses PostgreSQL `snappit_videos.id` as `recordId` and stores new assets at:

```text
{encodedUserId}/videos/raw/{recordId}.webm
{encodedUserId}/videos/processed/{recordId}.mp4
{encodedUserId}/thumbnails/{recordId}.jpg
```

Existing rows and S3 objects are migrated with Strategy B (copy, verify, then update). The script recognizes prior direct/root objects and legacy `videos/`, `raw/`, and `processed/` layouts. It validates WebM EBML and MP4 `ftyp` signatures and verifies copied lengths before changing canonical key columns. It does not invent an MP4 where no processed file exists: recordings that only have a WebM retain the WebM source and playback/download fallback until processed.

The Drizzle migration is additive and backfills UUID `id` values only if the live table does not already have them. It preserves an existing `video_id` as text (including UUID-formatted legacy values) and does not use it as an application identity. Run the Drizzle migrations first. Then run a read-only preview from `apps/web`:

```sh
node scripts/migrate-video-storage.js
```

Review the object mappings and unmatched direct objects. Copy and update the database:

```sh
node scripts/migrate-video-storage.js --apply
```

After checking the deployed application and confirming playback/download, optionally delete matched legacy source objects:

```sh
node scripts/migrate-video-storage.js --apply --delete-old
```

The script never deletes unmatched root-level video objects. Preserve a bucket backup/versioning window before using `--delete-old`. Objects larger than 5 GiB need multipart copy and are reported as failures; split those out for a multipart migration. The script requires `DATABASE_URL`, `S3_BUCKET_NAME`, `AWS_REGION` (optional), and credentials with list/head/get/copy/delete permissions as applicable.
