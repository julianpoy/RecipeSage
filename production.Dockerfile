FROM node:24.13-alpine

WORKDIR /app

# prisma
RUN apk add --no-cache openssl

# mdbtools
RUN apk add --no-cache mdbtools mdbtools-utils

# pdftotext
RUN apk add --no-cache poppler-utils

# pandoc (rtf/odt/docx text extraction)
RUN apk add --no-cache pandoc

# dev watch script
RUN apk add --no-cache inotify-tools

RUN corepack enable

COPY .npmrc .npmrc
COPY pnpm-lock.yaml pnpm-lock.yaml
COPY package.json package.json
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

COPY .prettierignore .prettierignore
COPY .prettierrc.json .prettierrc.json
COPY .nvmrc .nvmrc
COPY tsconfig.base.json tsconfig.base.json
COPY nx.json nx.json
COPY prisma.config.ts prisma.config.ts
COPY packages packages
COPY scripts scripts
COPY fonts fonts

# Prisma must be regenerated since schema is not present during install stage
RUN pnpm exec prisma generate

RUN pnpm exec nx run-many -t build -p backend,queue-worker,cli --parallel=3

ARG VERSION
ENV VERSION=$VERSION
ENV NX_SKIP_NX_CACHE=true
ENV NX_NO_CLOUD=true
ENV FONTS_PATH=/app/fonts
ENV EXPRESS_VIEWS_PATH=/app/dist/apps/backend/views
ENV FRONTEND_I18N_PATH=/app/packages/frontend/src/assets/i18n
ENV JOB_QUEUE_WORKER_PATH=/app/dist/apps/queue-worker/worker.cjs

