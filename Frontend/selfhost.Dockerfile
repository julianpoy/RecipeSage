FROM node:16-alpine as builder

ARG VERSION=development

WORKDIR /app

RUN apk add --no-cache git

COPY SharedUtils/package.json ./SharedUtils/package.json
COPY SharedUtils/package-lock.json ./SharedUtils/package-lock.json
RUN cd SharedUtils && npm install

COPY Frontend/package.json ./Frontend/package.json
COPY Frontend/package-lock.json ./Frontend/package-lock.json
RUN cd Frontend && npm install

COPY Frontend Frontend
COPY SharedUtils SharedUtils

WORKDIR /app/Frontend

RUN npm run build:selfhost
RUN npm run workbox

RUN sed -i "s/window.version = 'development';/window.version = '$VERSION';/" www/index.html


FROM nginx

COPY --from=builder /app/Frontend/www /usr/share/nginx/html

EXPOSE 80
