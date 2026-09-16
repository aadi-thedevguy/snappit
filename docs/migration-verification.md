# Migration verification — 2026-09-15

Base: `feat/inngest-video-transcoding` at `ae60cd4`.
Implementation branch: `feat/turborepo-inngest-connect-worker`.
`main` remained at `72635a7` throughout the migration.

## Results

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Exit 0; lockfile up to date |
| `pnpm lint` | Exit 0; all six packages checked |
| `pnpm typecheck` | Exit 0; shared packages, Next.js and worker checked; worker tests also typechecked |
| `pnpm test` | Exit 0; 23 tests passed, none failed or skipped |
| `pnpm build` | Exit 0; six build tasks completed |
| `pnpm --filter @snappit/web build` | Exit 0; independent Next.js build with TypeScript checking enabled |
| `pnpm --filter @snappit/video-worker build` | Exit 0; independent Node build |
| `FFMPEG_PATH=/opt/homebrew/bin/ffmpeg pnpm --filter @snappit/video-worker test:media` | Exit 0; five real media tests passed |
| `docker build -f apps/video-worker/Dockerfile -t snappit-video-worker:test .` | Exit 0; Node 22 Debian multi-stage image built |
| `docker run --rm --entrypoint /usr/bin/ffmpeg snappit-video-worker:test -version` | Exit 0; Debian FFmpeg 5.1.9 available |
| `docker run --rm -i --entrypoint node snappit-video-worker:test --input-type=module < scripts/verify-worker-image.mjs` | Exit 0; UID 1000, no environment files, no Next/React/TypeScript/ESLint/Turbo/tsx runtime packages, compiled imports load, synthetic encode/decode and faststart/cleanup pass |
| `docker compose --env-file deploy/video-worker/.env.worker.example -f deploy/video-worker/compose.yaml config` | Exit 0; worker-only service, internal readiness, no published ports |
| `git diff --check` and staged diff check | Exit 0 |

Local tools: Node 24.13.0 and pnpm 10.28.0. The container separately built and executed on Node 22, Linux ARM64. Build on the VPS or specify its platform for an x86 deployment. The first sandboxed web build could not download Google Fonts; the network-enabled build passed. Unit tests required permission for the test runner's local IPC socket. Neither workaround changes application code.

pnpm reports skipped install scripts for existing transitive `msw` and `protobufjs` packages. Unit, build and image smoke checks pass with those scripts disabled. No dependency major upgrade was introduced; Inngest remains 4.20.0 and Next.js remains 16.1.6.

## Reviewed boundaries

- The only `inngest/connect` import and call are in `apps/video-worker/src/worker.ts`.
- The sole Next.js Inngest route and old web transcoding implementation were removed.
- `ffmpeg-static` is absent from tracked source/manifests/lockfile.
- The web still emits typed `video/uploaded` with the existing deduplication ID, after S3 verification and record insertion.
- CloudFront and S3 key conventions are preserved through shared helpers.
- Most web files are byte-for-byte moves. The extension was not changed.
- Staged text was checked for real environment files, known local secret values and credential-shaped strings; no findings.
- No production DB, S3, Inngest registration or deployment setting was modified.

## File inventory

Moved the existing `app`, `components`, `constants`, `fonts`, `public`, web `lib`, application config, declarations, proxy, environment example and storage migration script into `apps/web`. Moved the Drizzle schema to `packages/db/src/schema.ts` and migrated the real media test into the worker.

Added the Node worker and its tests/configuration/Dockerfile; four workspace packages; workspace build/lint configuration; a targeted pnpm optional-peer hook; VPS Compose and environment example; additive SQL prerequisite; image smoke script; and operational documentation.

Removed the old `app/api/inngest/route.ts`, web transcoding function/media helper/client/database implementations (replaced at their new boundaries), and duplicate `package-lock.json`. Git recognizes 97 moved files in the migration.

## Owner-operated deployment work

Follow [video worker operations](video-worker.md) for the complete environment-variable table and commands. Before rollout:

1. Apply the nullable `processing_run_id` prerequisite through the existing migration process.
2. Configure Vercel's root as `apps/web`, allow workspace sources outside it, and build with `pnpm build` there.
3. Provide VPS DB/S3/Inngest connectivity, runtime secrets, an immutable image version and writable media volume.
4. Test a controlled video in an isolated environment, drain the old consumer, explicitly disable its saved Inngest registration, then activate the production worker.

Live cloud registration, an actual S3/DB upload, and production shutdown/draining were not exercised locally. Unit tests mock those services; the container smoke test verifies compiled runtime and real media processing. Event delivery still has the pre-existing gap between DB insertion and Inngest API delivery; the operations guide documents recovery. Never run both production consumers at once.
