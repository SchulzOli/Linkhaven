# The Linkhaven server: web app, device sync, news feed proxy and chart feed.
# Build from the repository root:  docker build -f server/Dockerfile .
# Ready-built: ghcr.io/schulzoli/linkhaven (see .github/workflows/docker.yml)

# 1. The web app (PWA build), served by the server for self-hosting. It is
#    the same for every platform, so it builds natively, once.
FROM --platform=$BUILDPLATFORM node:22-alpine AS web
WORKDIR /src
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npx vite build --mode pwa --outDir /web

# 2. The server.
FROM node:22-alpine

LABEL org.opencontainers.image.title="Linkhaven" \
      org.opencontainers.image.description="Linkhaven server: web app, end-to-end encrypted device sync, news feed proxy and chart feed" \
      org.opencontainers.image.source="https://github.com/SchulzOli/Linkhaven" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server/ ./
COPY --from=web /web ./web

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8790 \
    SYNC_DATA_DIR=/data

RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8790

HEALTHCHECK --interval=30s --timeout=5s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8790)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "linkhaven-server.mjs"]
