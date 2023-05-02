#!/bin/bash

set -e

if [ -z "$1" ]
then
  echo "Invalid command. Usage: ./api-selfhost.sh v1.0.0"
  exit 1
fi

docker buildx build . \
  --push \
  --platform linux/arm64/v8,linux/amd64 \
  -f packages/backend/Dockerfile \
  --build-arg VERSION=$1 \
  -t julianpoy/recipesage-selfhost:api-latest \
  -t julianpoy/recipesage-selfhost:api-$1

