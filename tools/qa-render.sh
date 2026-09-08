#!/usr/bin/env bash
# Full-page design QA render. Forces reveal animations on and images eager,
# because headless Chrome's lazy-load and IntersectionObserver do not play
# nicely with --virtual-time-budget. Not part of the published site.
set -euo pipefail

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${2:-/tmp/hgshots}"
PAGE="${1:-index.html}"
THEME="${3:-dark}"
WIDTH="${4:-1440}"

mkdir -p "$OUT/qa"
python3 - "$ROOT" "$PAGE" "$THEME" "$OUT" <<'PY'
import sys, pathlib, re, shutil
root, page, theme, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
src = pathlib.Path(root, page).read_text()
src = src.replace('loading="lazy"', '')
src = src.replace("localStorage.getItem('hg-theme')", "'%s'" % theme)
src = src.replace('</head>', '<style>.reveal{opacity:1!important;transform:none!important}</style></head>')
pathlib.Path(out, 'qa', page).write_text(src)
for name in ('assets',):
    dst = pathlib.Path(out, 'qa', name)
    if dst.exists(): shutil.rmtree(dst)
    shutil.copytree(pathlib.Path(root, name), dst)
PY

cd "$OUT/qa"
python3 -m http.server 4399 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
sleep 1

HEIGHT=$("$CHROME" --headless=new --disable-gpu --window-size="$WIDTH",1000 \
  --dump-dom "http://localhost:4399/$PAGE" 2>/dev/null >/dev/null; echo 16000)

"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-color-profile=srgb \
  --window-size="$WIDTH,$HEIGHT" --screenshot="$OUT/${PAGE%.html}-$THEME.png" \
  --virtual-time-budget=8000 "http://localhost:4399/$PAGE" 2>/dev/null

echo "wrote $OUT/${PAGE%.html}-$THEME.png"
