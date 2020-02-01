FROM node:12-alpine as builder

ARG VERSION=development

WORKDIR /app

COPY Frontend/package.json ./Frontend/package.json
COPY SharedUtils/package.json ./SharedUtils/package.json

RUN apk add --no-cache git

RUN cd Frontend && npm install
RUN cd SharedUtils && npm install

COPY Frontend Frontend
COPY SharedUtils SharedUtils

WORKDIR /app/Frontend

RUN npm run dist

RUN sed -i "s/window.version = 'development';/window.version = '$VERSION';/" www/index.html


FROM nginx

COPY --from=builder /app/Frontend/www /usr/share/nginx/html

EXPOSE 80
