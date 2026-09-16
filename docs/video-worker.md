# Video worker operations

The Next.js app sends events from Vercel. It does not run Inngest Connect. The video worker runs as a long-lived Docker container on the VPS and establishes the outbound Inngest Connect connection.

## Layout and commands

- `apps/web`: existing Next.js application, including thumbnail generation on upload, raw playback fallback and processed MP4 downloads.
- `apps/video-worker`: Node process, Inngest registration, FFmpeg and temporary file handling.
- `packages/db`: schema and injected database factory. The web keeps its existing connection settings; the worker defaults to a pool of two and verified TLS.
- `packages/inngest`: Inngest v4 typed event definition and client factory; clients are `snappit-web` and `snappit-video-worker`.
- `packages/validation`: upload event validation and the existing 500 MiB input limit.
- `packages/video-storage`: pure `/keys` entry point and server storage factory. Actual object keys remain `videos/raw/<videoId>.webm` and `videos/processed/<videoId>.mp4`.
- `drizzle.config.ts` and `drizzle/migrations`: existing migration ownership. The schema now lives in `packages/db/src/schema.ts`.
- `extension`: unchanged standalone Chrome extension.

Use Node 22.4+ and pnpm 10.28.0 (`corepack enable`). There is one root lockfile. Workspace packages compile to `dist`; direct app build scripts first compile their dependencies. Turborepo schedules builds and checks across the workspace. Workspace packages are injected and synchronized after builds so Docker deploy uses the root lockfile. The `.pnpmfile.cjs` hook removes Inngest's unused optional framework/TypeScript peers so the worker does not inherit Next.js from the web app. Revisit this rule before introducing an Inngest framework adapter.

```sh
pnpm install --frozen-lockfile
pnpm dev:web
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @snappit/web build
pnpm --filter @snappit/video-worker build
```

`dev:web` starts only Next.js. `pnpm dev` starts both applications after their dependencies build. When changing a shared package during development, rebuild that package before expecting consumers to see the change.

## Local development

Use a development PostgreSQL database and an isolated S3 bucket. This repository does not provision a database or object store. Create the database/schema using your existing Drizzle workflow. Do not point tests at production resources.

1. Copy `apps/web/.env.example` to `apps/web/.env` and fill in development credentials.
2. Copy `deploy/video-worker/.env.worker.example` to `apps/video-worker/.env`. Set `NODE_ENV=development`, `INNGEST_DEV=1`, `APP_VERSION=local`, and a development database/bucket. Production Inngest keys may be empty in this mode. Use `DATABASE_SSL=disable` only for a local database. Point `FFMPEG_PATH` at your local executable (for example `/opt/homebrew/bin/ffmpeg`) and `MEDIA_TEMP_DIRECTORY` at a writable directory.
3. Start the Inngest dev server with `pnpm dlx inngest-cli@latest dev --no-discovery`. It normally uses ports 8288 for the API/UI and 8289 for Connect.
4. Set `INNGEST_DEV=1` in the web environment too, then run `pnpm dev:web` in one terminal and `pnpm dev:worker` in another.
5. Upload a controlled test video through the web app. No HTTP URL registration for `/api/inngest` is required.

For an isolated Inngest Cloud test environment, use that environment's keys and set matching `INNGEST_ENV` values on web and worker. Use separate DB/S3 resources as well; event isolation alone does not isolate data.

Unit tests mock dependencies and never call production services. The optional `FFMPEG_PATH=/path/to/ffmpeg pnpm --filter @snappit/video-worker test:media` exercises real synthetic media, odd dimensions, audio/no audio, corrupt input, timeouts and cleanup.

## Vercel configuration

One-time dashboard changes, to be applied by the project owner:

- Root Directory: `apps/web`.
- Framework Preset: Next.js.
- Enable access to source files outside the root directory so workspace packages are included.
- Install Command: automatic pnpm detection from the root lockfile, or `pnpm install --frozen-lockfile`.
- Build Command: `pnpm build` (executed in `apps/web`, which builds only shared dependencies and Next.js).
- Output Directory: framework default.

Do not configure the repository-root `pnpm build` as Vercel's build command: that intentionally builds both applications for local/CI checks. No worker, FFmpeg binary, Compose service, or Connect import belongs in Vercel. The sole old Inngest `serve()` route has been removed.

Keep the existing web variables: `DATABASE_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME`, `CLOUDFRONT_KEY_PAIR_ID`, `CLOUDFRONT_PRIVATE_KEY`, `ARCJET_API_KEY`, `NEXT_PUBLIC_BASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Add/retain `INNGEST_EVENT_KEY`; `INNGEST_ENV` is optional for a named environment. `S3_ENDPOINT` is optional for an S3-compatible service. No worker signing key, FFmpeg settings or worker instance settings are needed on Vercel.

## Worker environment

Supply secrets at runtime through an untracked `.env.worker` on the VPS. Nothing reads shared-package environment variables at import time. Worker startup reports invalid variable names without printing their values.

| Variable | Requirement / default |
| --- | --- |
| `NODE_ENV` | `production` on VPS |
| `DATABASE_URL` | PostgreSQL URL reachable from VPS |
| `DATABASE_SSL` | `verify-full`; `require` supported; `disable` forbidden in production |
| `DATABASE_POOL_SIZE` | 2; between 1 and 10 per worker |
| `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY` | Required for cloud mode |
| `INNGEST_DEV` | 0 for cloud; 1 permitted only outside production |
| `INNGEST_ENV` | Optional named Inngest environment |
| `S3_BUCKET_NAME`, `AWS_REGION` | Required |
| `S3_ENDPOINT` | Optional custom HTTPS endpoint |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Supply both, or use the AWS default credential provider (e.g. instance role) |
| `APP_VERSION` | Required immutable image tag or Git SHA; injected at runtime |
| `WORKER_INSTANCE_ID` | Unique per running container; Compose default `snappit-vps-1` |
| `WORKER_CONCURRENCY` | 1; positive bounded value, never unlimited |
| `FFMPEG_PATH` | `/usr/bin/ffmpeg` in the image |
| `FFMPEG_TIMEOUT_MS` | 1800000 (30 minutes), configurable |
| `MEDIA_TEMP_DIRECTORY` | `/var/tmp/snappit-media` on named volume |
| `HEALTH_PORT` | 8080, internal only |
| `VIDEO_WORKER_IMAGE` | Compose image tag, preferably immutable |
| `WORKER_ENV_FILE` | Compose runtime file path; remove example override after copying |

Keep separate credentials for development and production. The example is deliberately not a runnable production configuration.

## Database prerequisite and stale runs

The repository's existing Drizzle migration journal is ignored/untracked. Do not invent a new journal or run a fresh initial migration against an existing database. Continue using the migration history maintained for your deployment.

Before deploying either updated application, add nullable `processing_run_id`. Review and execute `drizzle/manual/20260915_processing_run_id.sql` through your existing migration process, or generate the equivalent migration in your established Drizzle journal. Existing rows need no backfill. The migration is idempotent and does not modify existing data. No database migration is run automatically by the container.

The worker claims a row under a database lock and stores the Inngest run ID. Completion and failure updates require matching ownership and `processing` status. Metadata edits do not invalidate ownership. A run cannot take over another active run. If manually reprocessing an ID, first cancel/drain its old run and explicitly clear ownership/requeue through an operator-controlled process. Normal uploads use fresh IDs; singleton and idempotency still use `event.data.videoId`.

The web checks that the raw object exists and fits the size limit before inserting the row and sending the event. The existing event ID `<videoId>-uploaded` is preserved. Database insertion and event delivery are separate operations; an event API outage after insertion still requires an operator to resend the same deduplicated event for the existing `uploaded` row. An outbox/reconciler is outside this migration.

`pnpm migrate:storage` still runs the existing preview-only storage migration; append `--apply` only after reviewing output and stopping uploads/workers. Keep old objects until playback has been verified. The monorepo move does not itself change any S3 paths or move data.

## Docker and VPS deployment

Build with the repository root as context:

```sh
docker build -f apps/video-worker/Dockerfile -t snappit-video-worker:test .
docker run --rm --entrypoint /usr/bin/ffmpeg snappit-video-worker:test -version
docker run --rm -i --entrypoint node snappit-video-worker:test --input-type=module < scripts/verify-worker-image.mjs
docker compose --env-file deploy/video-worker/.env.worker.example -f deploy/video-worker/compose.yaml config
```

The multi-stage Node 22 Debian image installs FFmpeg and CA certificates, runs as UID 1000, and copies only deployed production dependencies and compiled output. Compose uses Node's built-in `fetch` for health checks, so curl is unnecessary. No ports are published.

On the VPS, install Docker with the Compose plugin and pull this repository (or pull a worker image from your registry). If building locally for an x86 VPS from an ARM machine, build with `--platform linux/amd64` or build on the VPS. Use an immutable image tag matching `APP_VERSION`.

```sh
cp deploy/video-worker/.env.worker.example deploy/video-worker/.env.worker
# Edit .env.worker: fill credentials, set the image/version, and REMOVE WORKER_ENV_FILE.
docker compose --env-file deploy/video-worker/.env.worker -f deploy/video-worker/compose.yaml build
docker compose --env-file deploy/video-worker/.env.worker -f deploy/video-worker/compose.yaml up -d
docker compose --env-file deploy/video-worker/.env.worker -f deploy/video-worker/compose.yaml ps
docker compose --env-file deploy/video-worker/.env.worker -f deploy/video-worker/compose.yaml logs -f video-worker
```

Use `pull` instead of `build` when deploying a registry image. Do not run these commands on Vercel. Protect the real environment file with owner-only permissions. If binding a host temporary directory instead of the named volume, make it writable by UID 1000.

## Readiness, shutdown and capacity

`GET /ready` returns 200 only when Connect is `ACTIVE`; it returns 503 during connection setup/reconnection/shutdown. Other paths return 404. The endpoint does not expose credentials or require public ingress. An unhealthy Docker health check is a diagnostic; `restart: unless-stopped` restarts exited processes, not merely unhealthy containers. Alert on sustained unhealthy state and queued functions.

Inngest's SDK handles SIGTERM/SIGINT, stops accepting work and drains in-flight steps. The process waits for `connection.closed`, then closes its HTTP server, S3 client and DB pool. Compose allows 45 minutes to stop: the default 30-minute encoding limit plus bounded download/upload time and cleanup. Increase this grace period when increasing the FFmpeg timeout. Avoid `docker kill` during active rendering.

Function concurrency remains 2 and limits simultaneous steps for the durable function across workers. Connect worker concurrency defaults to 1 and limits steps accepted by an individual connection. FFmpeg uses two threads inside each encode. Increase these only after measuring CPU, RAM, queue delay and temporary disk use. Use a unique instance ID for each worker.

Budget temporary storage for input plus encoded output for each concurrent encode, with headroom: a 500 MiB compressed input can produce a substantially larger output. Each attempt gets a unique directory and removes it on success or failure. The volume persists across container replacement. Hard kills/host crashes can leave orphaned directories; remove those only while workers are stopped and no in-flight attempt can use them. Monitor volume capacity.

## Network access

Allow outbound TLS to your DB host/port (typically 5432), your S3 endpoint (443), and Inngest HTTPS/WebSocket services (443). In local development the dev server also uses 8288/8289. If the DB restricts clients, allow the VPS's outbound IP or route through the existing private network. Do not open the database publicly. Confirm that the connection string is usable outside Vercel and that its certificate chain is trusted; mount the provider CA and use `NODE_EXTRA_CA_CERTS` where required. Keep per-worker pools small because each replica creates its own pool. S3 credentials need input reads, output writes and multipart-upload cleanup privileges for the relevant video prefixes.

## Production rollout and rollback

1. Apply the additive DB prerequisite. Deploy the worker in an isolated Inngest environment with test DB/S3 resources.
2. Confirm connection/readiness. Process one controlled upload and verify download, valid seekable MP4, output upload, row status, logs, retry behavior and temporary cleanup.
3. Before switching production, stop new uploads briefly and drain/cancel the old Vercel function's active runs. Inventory queued `uploaded` rows for replay if needed.
4. Deploy the web app with the old transcoding route removed. **Deleting the route does not necessarily delete Inngest Cloud's saved app registration.** Disable/archive the old `snappit` transcoding function/app in Inngest and verify it no longer consumes `video/uploaded` before proceeding.
5. Activate the production Connect worker with production keys and resources. Confirm only `snappit-video-worker` handles the trigger, then resume uploads and resend any queued events not scheduled during cutover. Do not leave both app registrations active.
6. Monitor failures, CPU, disk and queue depth before increasing concurrency.

No dashboard, registration, database, S3 or VPS changes are made by this repository migration. Those are owner-operated rollout steps.

To roll back, pause uploads and drain/stop the Connect worker before restoring any previous event consumer. Keep `processing_run_id`; it is additive and safe for older code. Redeploy the prior web build and restore its Vercel root setting if rolling back to the pre-monorepo layout. Do not re-enable the known failing Vercel FFmpeg implementation without fixing its binary packaging; raw playback remains available while processing is paused. Inventory pending rows and deliberately replay them once a single healthy consumer is available.

See the [Inngest Connect documentation](https://www.inngest.com/docs/setup/connect) for connection states, worker concurrency and graceful shutdown.
