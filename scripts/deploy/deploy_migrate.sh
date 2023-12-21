#!/bin/bash

set -e

if [ -z "$1" ]
then
    echo "Invalid command. Usage: ./deploy_migrate.sh 1.0.0"
    exit 1
fi

export RELEASE_TAG="$1"

envsubst < kube/configs/migrate.yml | kubectl apply -f -

