#!/bin/sh

set -eu

FONTS_BASE_URL="https://static.recipesage.com/assets/fonts/2026-11-26"
CHECKSUMS_FILE="$(cd "$(dirname "$0")" && pwd)/fonts.sha256"
DESTINATION="$1"

while read -r _ fontPath; do
  mkdir -p "$DESTINATION/$(dirname "$fontPath")"
  curl -sSfL -o "$DESTINATION/$fontPath" "$FONTS_BASE_URL/$fontPath"
done < "$CHECKSUMS_FILE"

cd "$DESTINATION"
sha256sum -c "$CHECKSUMS_FILE"
