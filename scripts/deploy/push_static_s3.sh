#!/bin/bash

set -e

PWD=$(dirname "$0")

TAG=$1

if [ -z "$TAG" ]
then
  echo "Invalid command. Usage: ./push_static_s3.sh v1.0.0"
  exit 1
fi

find www/ -regextype egrep -regex '.+\.[a-f0-9]{20}\..+' -exec mv -t www-revhashed/ -- {} +

sync_to_s3 () {
  DIR=$1
  CACHE_AGE=$2

  aws s3 sync $DIR s3://chefbook-static/frontend/$TAG/ \
    --acl public-read \
    --cache-control "Cache-Control:max-age=${CACHE_AGE}, must-revalidate"
}

# Push to tagged path
sync_to_s3 www 600
sync_to_s3 www-revhashed 604800

# Push to latest (STG)
aws s3 sync s3://chefbook-static/frontend/$TAG/ s3://chefbook-static/frontend/latest

