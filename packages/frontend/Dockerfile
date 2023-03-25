FROM node:16-alpine

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

EXPOSE 8100

CMD ["npm", "run", "start"]
