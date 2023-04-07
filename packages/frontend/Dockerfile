FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache git

COPY . .
RUN npm install

EXPOSE 8100

RUN mkdir -p /app/packages/frontend/www

