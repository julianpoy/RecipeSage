FROM node-with-mdbtools:18-0.7.1

WORKDIR /app

# node-gyp
RUN apk add --no-cache python3 make

RUN apk add --no-cache inotify-tools

RUN npm install -g tsx

COPY . .
RUN npm install

# Include version build arg within the container env
ARG VERSION
ENV VERSION=$VERSION

