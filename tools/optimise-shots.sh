#!/usr/bin/env bash
# Turns the full-resolution XCUITest captures in assets/screens/ into the WebP
# files the site actually ships. The originals are gitignored; regenerate them
# from the HabitGlass repo with `make test-ui-light` and `make test-ui-dark`,
# then export the attachments out of the .xcresult bundle.
#
# 820px wide is roughly 2x the largest size any handset is displayed at.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/assets/screens"
OUT="$ROOT/assets/shots"
WIDTH=820

[ -d "$SRC" ] || { echo "no $SRC — export the XCUITest attachments first"; exit 1; }
mkdir -p "$OUT"

# published name : source file
MAP="
home:home-%s-seeded.png
detail:detail-%s-1.png
month:detail-%s-2.png
create:newhabit-%s-2.png
settings:settings-%s-1.png
"

for appearance in light dark; do
  while IFS=: read -r name pattern; do
    [ -n "$name" ] || continue
    file=$(printf "$pattern" "$appearance")
    if [ ! -f "$SRC/$file" ]; then
      echo "missing $file, skipping"
      continue
    fi
    magick "$SRC/$file" -resize "${WIDTH}x" -strip \
      -define webp:method=6 -quality 84 "$OUT/$name-$appearance.webp"
    echo "$file -> $name-$appearance.webp"
  done <<< "$MAP"
done

du -ch "$OUT"/*.webp | tail -1
