#!/bin/bash

set -e

if [ -z "$1" ] || [ -z "$2" ]
then
    echo "Invalid command. Usage: ./deploy_tag.sh api|api-beta|static|static-beta|all 1.0.0"
    exit 1
fi

export RELEASE_TAG="$2"

if [ "$1" == "api" ] || [ "$1" == "all" ]
then
    envsubst < kube/configs/api.yml | kubectl apply -f -
fi

if [ "$1" == "api-beta" ] || [ "$1" == "all" ]
then
    envsubst < kube/configs/api-beta.yml | kubectl apply -f -
fi

if [ "$1" == "all" ]
then
    sleep 5s # Wait for changes to propagate
fi

if [ "$1" == "static" ] || [ "$1" == "all" ]
then
    aws s3 cp --recursive s3://chefbook-static/frontend/$RELEASE_TAG/ s3://chefbook-static/frontend/prod
fi

if [ "$1" == "static-beta" ] || [ "$1" == "all" ]
then
    aws s3 cp --recursive s3://chefbook-static/frontend/$RELEASE_TAG/ s3://chefbook-static/frontend/beta
fi
