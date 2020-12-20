#!/bin/bash

set -e

docker build --build-arg VERSION=$1 -f Backend/Dockerfile -t julianpoy/recipesage:api-latest -t rs-api-builder .
docker build --build-arg VERSION=$1 -f Backend/selfhost.Dockerfile -t julianpoy/recipesage-selfhost:api-latest .

docker push julianpoy/recipesage:api-latest
docker push julianpoy/recipesage-selfhost:api-latest

if ! [ -z "$1" ]
then
    docker image tag julianpoy/recipesage:api-latest julianpoy/recipesage:api-$1
    docker image tag julianpoy/recipesage-selfhost:api-latest julianpoy/recipesage-selfhost:api-$1
    docker push julianpoy/recipesage:api-$1
    docker push julianpoy/recipesage-selfhost:api-$1
fi

