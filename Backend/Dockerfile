FROM node:12-alpine

WORKDIR /app

RUN apk add --no-cache \
    git \
    # === MDBTools Deps ===
    sqlite \
    wget \
    ca-certificates \
    autoconf \
    automake \
    build-base \
    glib \
    glib-dev \
    libc-dev \
    libtool \
    linux-headers \
    bison flex-dev unixodbc unixodbc-dev \
    p7zip && \
    cd /tmp && \
    wget "https://github.com/brianb/mdbtools/archive/0.7.1.zip" && \
    unzip 0.7.1.zip && rm 0.7.1.zip && \
    cd mdbtools-0.7.1 && \
    autoreconf -i -f && \
    ./configure --with-unixodbc=/usr/local --disable-man && make && make install && \
    cd /tmp && \
    apk del autoconf automake build-base glib-dev libc-dev unixodbc-dev flex-dev && \
    rm -rf mdbtools-0.7.1

RUN apk add --no-cache python3

COPY Backend/package.json ./Backend/package.json
COPY Backend/package-lock.json ./Backend/package-lock.json
COPY SharedUtils/package.json ./SharedUtils/package.json
COPY SharedUtils/package-lock.json ./SharedUtils/package-lock.json

RUN cd Backend && npm install
RUN cd SharedUtils && npm install

COPY Backend Backend
COPY SharedUtils SharedUtils

# Include version build arg within the container env
ARG VERSION
ENV VERSION=$VERSION

WORKDIR /app/Backend
