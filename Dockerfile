FROM node:24.10-alpine

WORKDIR /app

# prisma
RUN apk add --no-cache openssl

# node-gyp
RUN apk add --no-cache python3 make clang build-base

# mdbtools
RUN apk add --no-cache mdbtools mdbtools-utils

# pdftotext
RUN apk add --no-cache poppler-utils

# dev watch script
RUN apk add --no-cache inotify-tools

RUN npm install -g tsx

COPY package-lock.json package-lock.json
COPY package.json package.json
RUN npm ci

COPY .prettierignore .prettierignore
COPY .prettierrc.json .prettierrc.json
COPY .nvmrc .nvmrc
COPY tsconfig.base.json tsconfig.base.json
COPY nx.json nx.json
COPY packages packages
COPY scripts scripts

# Prisma must be regenerated since schema is not present during install stage
RUN npx prisma generate

# Include version build arg within the container env
ARG VERSION
ENV VERSION=$VERSION

