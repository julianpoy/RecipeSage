FROM node:12-alpine as builder

WORKDIR /app

COPY Frontend/package.json ./Frontend/package.json
COPY SharedUtils/package.json ./SharedUtils/package.json

RUN apk add --no-cache git

RUN cd Frontend && npm install
RUN cd SharedUtils && npm install

COPY Frontend Frontend
COPY SharedUtils SharedUtils

WORKDIR /app/Frontend

CMD ["npm", "run", "dist"]


FROM nginx

COPY --from=builder /app/Frontend/www /usr/share/nginx/html

EXPOSE 80
