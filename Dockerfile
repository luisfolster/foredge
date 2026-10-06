FROM node:24-alpine

WORKDIR /app
RUN npm install -g pnpm@11.19.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY api/package.json api/package.json
COPY docs/package.json docs/package.json
RUN pnpm install --frozen-lockfile

COPY api api
RUN pnpm --filter @foredge/api build

WORKDIR /app/api
EXPOSE 3100
CMD ["sh", "-c", "node dist/migrate.js && node dist/server.js"]
