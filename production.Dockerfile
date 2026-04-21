FROM node:24.13-alpine

WORKDIR /app

# prisma
RUN apk add --no-cache openssl

# mdbtools
RUN apk add --no-cache mdbtools mdbtools-utils

# pdftotext
RUN apk add --no-cache poppler-utils

# dev watch script
RUN apk add --no-cache inotify-tools

COPY package-lock.json package-lock.json
COPY package.json package.json
RUN npm ci

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
RUN npx prisma generate

ARG VERSION
ARG FRONTEND_BUILD_TARGET=build
ENV VERSION=$VERSION
ENV APP_VERSION=$VERSION
ENV NX_SKIP_NX_CACHE=true
ENV NX_NO_CLOUD=true

RUN npx nx run-many -t build -p backend,queue-worker --parallel=6
RUN npx nx $FRONTEND_BUILD_TARGET frontend

ENV FONTS_PATH=/app/fonts
ENV EXPRESS_VIEWS_PATH=/app/dist/apps/backend/views
ENV FRONTEND_I18N_PATH=/app/packages/frontend/src/assets/i18n
ENV JOB_QUEUE_WORKER_PATH=/app/dist/apps/queue-worker/worker.cjs

CMD ["node", "packages/frontend/www/server/server.mjs"]
