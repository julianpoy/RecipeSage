FROM node:12-alpine

WORKDIR /app

COPY Backend/package.json ./Backend/package.json
COPY SharedUtils/package.json ./SharedUtils/package.json

RUN apk add --no-cache git

RUN cd Backend && npm install
RUN cd SharedUtils && npm install

COPY Backend Backend
COPY SharedUtils SharedUtils

WORKDIR /app/Backend
