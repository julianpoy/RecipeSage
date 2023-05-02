FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache git

COPY . .
RUN npm install

EXPOSE 8100

WORKDIR /app/packages/frontend

CMD npx nx start @recipesage/frontend
