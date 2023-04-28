#!/bin/sh

set -e

export DOCKER_BUILD_KIT=1
export DOCKER_CLI_EXPERIMENTAL=enabled

wget https://github.com/docker/buildx/releases/download/v0.10.4/buildx-v0.10.4.linux-amd64
chmod a+x buildx-v0.10.4.linux-amd64
mkdir -p ~/.docker/cli-plugins
mv buildx-v0.10.4.linux-amd64 ~/.docker/cli-plugins/docker-buildx

docker run --privileged --rm tonistiigi/binfmt --install all

docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
docker context create multi-arch-build
docker buildx create --use multi-arch-build

