FROM node:22-bookworm-slim AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter @snappit/video-worker...
RUN pnpm --filter @snappit/video-worker build
RUN pnpm --filter @snappit/video-worker deploy --prod /output

FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /var/tmp/snappit-media && chown node:node /var/tmp/snappit-media
ENV NODE_ENV=production
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV MEDIA_TEMP_DIRECTORY=/var/tmp/snappit-media
WORKDIR /app
COPY --from=build --chown=node:node /output ./
USER node
CMD ["node", "dist/worker.js"]
