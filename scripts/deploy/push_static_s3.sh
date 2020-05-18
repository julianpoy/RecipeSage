#!/bin/bash

set -e

PWD=$(dirname "$0")

TAG=$1

if [ -z "$TAG" ]
then
  echo "Invalid command. Usage: ./push_static_s3.sh v1.0.0"
  exit 1
fi

mkdir -p www-revhashed

find www/ -regextype egrep -regex '.+\.[a-f0-9]{20}\..+' -exec mv -t www-revhashed/ -- {} +

# Time sensitive assets only
aws s3 sync www s3://chefbook-static/frontend/$TAG/ \
  --exclude "*" \
  --include "index.html" \
  --include "service-worker.js" \
  --acl public-read \
  --cache-control "max-age=600, must-revalidate"

# General, non-revhashed frontend files - semi time sensitive
aws s3 sync www s3://chefbook-static/frontend/$TAG/ \
  --exclude "index.html" \
  --exclude "service-worker.js" \
  --acl public-read \
  --cache-control "max-age=86400, must-revalidate"

# Revhashed files (previously copied to www-revhashed) - persist long-term
aws s3 sync www-revhashed s3://chefbook-static/frontend/$TAG/ \
  --acl public-read \
  --cache-control "max-age=604800, must-revalidate"

# Push to latest (STG)
aws s3 sync s3://chefbook-static/frontend/$TAG/ s3://chefbook-static/frontend/latest

