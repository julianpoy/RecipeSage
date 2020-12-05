#!/bin/bash

set -e

docker build -f Frontend/circle.Dockerfile -t julianpoy/recipesage:static-latest --build-arg VERSION=$1 .
docker build -f Frontend/selfhost.Dockerfile -t julianpoy/recipesage-selfhost:static-latest --build-arg VERSION=$1 .

docker push julianpoy/recipesage:static-latest
docker push julianpoy/recipesage-selfhost:static-latest

if ! [ -z "$1" ]
then
  docker image tag julianpoy/recipesage:static-latest julianpoy/recipesage:static-$1
  docker image tag julianpoy/recipesage-selfhost:static-latest julianpoy/recipesage-selfhost:static-$1
  docker push julianpoy/recipesage:static-$1
  docker push julianpoy/recipesage-selfhost:static-$1
fi
