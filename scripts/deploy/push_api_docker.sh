#!/bin/bash

set -e

docker build --build-arg VERSION=$1 -f Backend/Dockerfile -t julianpoy/recipesage:api-latest .

docker push julianpoy/recipesage:api-latest

if ! [ -z "$1" ]
then
    docker image tag julianpoy/recipesage:api-latest julianpoy/recipesage:api-$1
    docker push julianpoy/recipesage:api-$1
fi

