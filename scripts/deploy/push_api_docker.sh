#!/bin/bash

set -e

if [ -z "$1" ]
then
  echo "Invalid command. Usage: ./push_api_docker.sh v1.0.0"
  exit 1
fi

docker build --build-arg VERSION=$1 -f Backend/Dockerfile -t julianpoy/recipesage:api-latest -t rs-api-builder .
docker build --build-arg VERSION=$1 -f Backend/selfhost.Dockerfile -t julianpoy/recipesage-selfhost:api-latest .

# Only push to latest tag if tag is a versioned tag
if [[ $1 == v* ]]
then
  docker push julianpoy/recipesage:api-latest
  docker push julianpoy/recipesage-selfhost:api-latest
fi

docker image tag julianpoy/recipesage:api-latest julianpoy/recipesage:api-$1
docker image tag julianpoy/recipesage-selfhost:api-latest julianpoy/recipesage-selfhost:api-$1
docker push julianpoy/recipesage:api-$1
docker push julianpoy/recipesage-selfhost:api-$1

docker rmi julianpoy/recipesage:api-$1
docker rmi julianpoy/recipesage-selfhost:api-$1

docker rmi julianpoy/recipesage:api-latest
docker rmi julianpoy/recipesage-selfhost:api-latest
docker rmi rs-api-builder

