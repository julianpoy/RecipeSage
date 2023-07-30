FROM julianpoy/node-with-mdbtools:18-0.7.1

WORKDIR /app

# node-gyp
RUN apk add --no-cache python3 make clang build-base

RUN apk add --no-cache inotify-tools

RUN npm install -g tsx

COPY package-lock.json package-lock.json
COPY package.json package.json
RUN npm ci

COPY jest.config.ts jest.config.ts
COPY jest.preset.js jest.preset.js
COPY .prettierignore .prettierignore
COPY .prettierrc.json .prettierrc.json
COPY .nvmrc .nvmrc
COPY tsconfig.base.json tsconfig.base.json
COPY nx.json nx.json
COPY packages packages
COPY scripts scripts

# Include version build arg within the container env
ARG VERSION
ENV VERSION=$VERSION

