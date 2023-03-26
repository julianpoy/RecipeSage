FROM node:16-alpine as builder

ARG VERSION=development

WORKDIR /app

RUN apk add --no-cache git

COPY . .
RUN npm install

RUN npx nx build:selfhost @recipesage/frontend

RUN sed -i "s/window.version = 'development';/window.version = '$VERSION';/" packages/frontend/www/index.html


FROM nginx

COPY --from=builder /app/packages/frontend/www /usr/share/nginx/html

EXPOSE 80
