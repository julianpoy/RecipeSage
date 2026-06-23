#!/bin/sh
set -e

export NODE_OPTIONS=--max-old-space-size=8192

APP_VERSION=${CIRCLE_TAG:-stg} pnpm exec nx run frontend:build:desktop --skip-nx-cache

rm -rf packages/desktop/renderer
cp -r packages/frontend/www packages/desktop/renderer

sed -i "s/window.version = \"development\";/window.version = \"${CIRCLE_TAG:-stg}\";/" packages/desktop/renderer/index.html

VERSION="${CIRCLE_TAG#v}"
sed -i "s/\"version\": \".*\"/\"version\": \"${VERSION}\"/" packages/desktop/package.json
sed -i 's/"name": "@recipesage\/desktop"/"name": "recipesage-desktop"/' packages/desktop/package.json
