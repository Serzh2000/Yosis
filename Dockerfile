# Official image manifest digests verified against registry-1.docker.io.
FROM node:22.23.3-bookworm-slim@sha256:43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c AS node-base
FROM node-base AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM python:3.13.9-slim-bookworm@sha256:b685a4fa58bb19d1814d78a1ec0f0208f351452724f78b20212c984d6e124a34
# A fixed signed Debian snapshot keeps Icarus and its system dependencies stable.
RUN rm -f /etc/apt/sources.list.d/debian.sources && \
    printf 'deb [check-valid-until=no] https://snapshot.debian.org/archive/debian/20261001T000000Z bookworm main\n' > /etc/apt/sources.list && \
    apt-get update && apt-get install -y --no-install-recommends iverilog=11.0-1.1+b1 util-linux && \
    rm -rf /var/lib/apt/lists/*
COPY --from=node-base /usr/local/bin/node /usr/local/bin/node
COPY deploy/gowin-requirements.txt /tmp/gowin-requirements.txt
RUN python -m venv /opt/gowin && /opt/gowin/bin/pip install --only-binary=:all: --require-hashes -r /tmp/gowin-requirements.txt && \
    /opt/gowin/bin/pip check && rm /tmp/gowin-requirements.txt
WORKDIR /app
COPY --from=build /app/.server-dist ./.server-dist
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
RUN useradd --uid 10001 --create-home yosis && mkdir /data /cache && chown yosis:yosis /data /cache
USER 10001:10001
ENV NODE_ENV=production YOSIS_WORKSPACE=/app YOSIS_DATA_DIR=/data YOSIS_API_PORT=3001 \
    YOSIS_NEXTPNR=/opt/gowin/bin/yowasp-nextpnr-himbaechel-gowin YOSIS_GOWIN_PACK=/opt/gowin/bin/gowin_pack \
    YOWASP_CACHE_DIR=/cache XDG_CACHE_HOME=/cache
EXPOSE 3001
CMD ["node", ".server-dist/index.mjs", "--production"]
