#!/bin/bash

set -e

if [ -z "$1" ]
then
  echo "Invalid command. Usage: ./api-hosted.sh v1.0.0"
  exit 1
fi

docker build --build-arg VERSION=$1 -f Dockerfile -t julianpoy/recipesage:api-latest .

# Only push to latest tag if tag is a versioned tag
if [[ $1 == v* ]]
then
  docker push julianpoy/recipesage:api-latest
fi

docker image tag julianpoy/recipesage:api-latest julianpoy/recipesage:api-$1
docker push julianpoy/recipesage:api-$1

docker rmi julianpoy/recipesage:api-$1

docker rmi julianpoy/recipesage:api-latest

