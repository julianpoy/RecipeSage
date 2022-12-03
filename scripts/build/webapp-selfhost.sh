#!/bin/bash

set -e

if [ -z "$1" ]
then
  echo "Invalid command. Usage: ./webapp-selfhost.sh v1.0.0"
  exit 1
fi

docker build -f Frontend/selfhost.Dockerfile -t julianpoy/recipesage-selfhost:static-latest --build-arg VERSION=$1 .

# Only push to latest tag if tag is a versioned tag
if [[ $1 == v* ]]
then
  docker push julianpoy/recipesage-selfhost:static-latest
fi

docker image tag julianpoy/recipesage-selfhost:static-latest julianpoy/recipesage-selfhost:static-$1
docker push julianpoy/recipesage-selfhost:static-$1

docker rmi julianpoy/recipesage-selfhost:static-$1

docker rmi julianpoy/recipesage-selfhost:static-latest

