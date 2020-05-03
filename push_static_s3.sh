#!/bin/bash

set -e

TAG=$1

if [ -z "$TAG" ]
then
  echo "Invalid command. Usage: ./push_static_s3.sh v1.0.0"
  exit 1
fi

# Versioned, non-hashed
s3cmd sync www/* s3://chefbook-static/frontend/$TAG/ \
  --rexclude=".+\.[a-f0-9]{20}\..+" \
  --acl-public \
  --add-header="Cache-Control:max-age=600, must-revalidate" \
  --recursive \
  --access_key=$AWS_ACCESS_KEY_ID \
  --secret_key="$AWS_SECRET_ACCESS_KEY" \
  --region=$AWS_REGION

# Versioned, hashed
s3cmd sync www/* s3://chefbook-static/frontend/$TAG/ \
  --rexclude=".*" \
  --rinclude=".+\.[a-f0-9]{20}\..+" \
  --acl-public \
  --add-header="Cache-Control:max-age=604800, must-revalidate" \
  --recursive \
  --access_key=$AWS_ACCESS_KEY_ID \
  --secret_key="$AWS_SECRET_ACCESS_KEY" \
  --region=$AWS_REGION

# Latest, non-hashed
s3cmd sync www/* s3://chefbook-static/frontend/latest/ \
  --rexclude=".+\.[a-f0-9]{20}\..+" \
  --acl-public \
  --add-header="Cache-Control:max-age=600, must-revalidate" \
  --recursive \
  --access_key=$AWS_ACCESS_KEY_ID \
  --secret_key="$AWS_SECRET_ACCESS_KEY" \
  --region=$AWS_REGION

# Latest, hashed
s3cmd sync www/* s3://chefbook-static/frontend/latest/ \
  --rexclude=".*" \
  --rinclude=".+\.[a-f0-9]{20}\..+" \
  --acl-public \
  --add-header="Cache-Control:max-age=604800, must-revalidate" \
  --recursive \
  --access_key=$AWS_ACCESS_KEY_ID \
  --secret_key="$AWS_SECRET_ACCESS_KEY" \
  --region=$AWS_REGION

