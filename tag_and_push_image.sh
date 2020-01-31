#!/bin/bash

set -e

if [ "$1" == "api" ] || [ "$1" == "all" ]
then
    docker build -f Backend/Dockerfile -t julianpoy/recipesage:api-latest .

    docker push julianpoy/recipesage:api-latest

    if ! [ -z "$2" ]
    then
        docker image tag recipesage_express:latest julianpoy/recipesage:api-$2
        docker push julianpoy/recipesage:api-$2
    fi
fi

if [ "$1" == "static" ] || [ "$1" == "all" ]
then
    docker build -f Frontend/prod.Dockerfile -t julianpoy/recipesage:static-latest --build-arg VERSION=$2 .



    docker push julianpoy/recipesage:static-latest

    if ! [ -z "$2" ]
    then
        docker image tag julianpoy/recipesage:static-latest julianpoy/recipesage:static-$2
        docker push julianpoy/recipesage:static-$2
    fi
fi
