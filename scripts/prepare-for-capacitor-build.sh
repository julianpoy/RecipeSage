#!/bin/sh
set -e

PLATFORM="$1"
case "$PLATFORM" in
  android|ios) ;;
  *)
    echo "Usage: $0 <android|ios>"
    exit 1
    ;;
esac

export NODE_OPTIONS=--max-old-space-size=8192

# The web build sets baseHref "/app/" because the site is served at example.com/app/.
# Capacitor serves the bundled assets from the root of a local origin, so it needs baseHref "/".
APP_VERSION=${CIRCLE_TAG:-stg} pnpm exec nx run frontend:build:production --base-href=/ --skip-nx-cache

sed -i.bak "s/window.version = \"development\";/window.version = \"${CIRCLE_TAG:-stg}\";/" packages/frontend/www/index.html
rm -f packages/frontend/www/index.html.bak

cd packages/frontend
../../node_modules/.bin/cap sync "$PLATFORM"
