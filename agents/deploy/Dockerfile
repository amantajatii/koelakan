# Build context = repository root:  docker build -f agents/deploy/Dockerfile -t koelakan-agent .
# The agents import sim/src (strategy) through sim-bridge.ts, so both trees are compiled together.
# Keys are NEVER copied into the image: they are mounted at /secrets at run time.
FROM node:24-alpine AS build
RUN npm install -g pnpm@10.18.3
WORKDIR /repo
COPY agents/package.json agents/pnpm-lock.yaml agents/
RUN cd agents && pnpm install --frozen-lockfile
COPY agents/tsconfig.json agents/tsconfig.build.json agents/
COPY agents/src agents/src
COPY sim/src sim/src
RUN cd agents && pnpm build && pnpm prune --prod

FROM node:24-alpine
ENV NODE_ENV=production DATA_DIR=/data KEYS_DIR=/secrets/keys FCK_DIR=/secrets/fck PORT=8787
WORKDIR /app/agents
COPY --from=build /repo/agents/node_modules node_modules
COPY --from=build /repo/agents/dist dist
COPY agents/package.json package.json
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# service:        node dist/agents/src/cli/daemon.js   (default)
# external grosir: node dist/agents/src/cli/grosir.js
CMD ["node", "dist/agents/src/cli/daemon.js"]
