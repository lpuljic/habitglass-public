#!/usr/bin/env bash
# Renders tools/og.html into assets/og.png (1200x630, the Open Graph size).
# Re-run it if the tagline or the hero screenshot changes.
set -euo pipefail

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT"
python3 -m http.server 4400 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
sleep 1

"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-color-profile=srgb \
  --window-size=1200,630 --screenshot="/tmp/hg-og.png" \
  --virtual-time-budget=4000 "http://localhost:4400/tools/og.html" 2>/dev/null

magick /tmp/hg-og.png -strip -interlace none -sampling-factor 4:2:0 -quality 90 "$ROOT/assets/og.jpg"
echo "wrote assets/og.jpg ($(magick identify -format '%wx%h, %b' "$ROOT/assets/og.jpg"))"
