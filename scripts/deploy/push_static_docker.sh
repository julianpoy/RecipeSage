#!/bin/bash

set -e

docker build -f Frontend/circle.Dockerfile -t julianpoy/recipesage:static-latest --build-arg VERSION=$2 .

docker push julianpoy/recipesage:static-latest

if ! [ -z "$2" ]
then
  docker image tag julianpoy/recipesage:static-latest julianpoy/recipesage:static-$2
  docker push julianpoy/recipesage:static-$2
fi
