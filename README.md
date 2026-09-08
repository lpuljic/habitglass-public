# habitglass.info

The marketing site for [HabitGlass](https://github.com/), a habit tracker for
iOS 26. Static HTML, no build step, no dependencies, no JavaScript framework.
Deployed with GitHub Pages on the custom domain in `CNAME`.

```
index.html          landing page
support.html        support / common problems
privacy.html        privacy policy   (text mirrors HabitGlass/website/privacy.html)
terms.html          terms of service (text mirrors HabitGlass/website/terms.html)
404.html            not-found page
assets/css/site.css the whole stylesheet, tokens at the top
assets/js/site.js   appearance toggle, scroll reveal, the bubble demo
assets/fonts/       Satoshi, self-hosted (ITF Free Font License, webfont use allowed)
assets/shots/       app screenshots, WebP, what actually ships
assets/screens/     full-resolution XCUITest captures, gitignored
tools/              helper scripts, not part of the site
```

## Local preview

```bash
python3 -m http.server 4321   # then open http://localhost:4321
```

That's it. There is nothing to install and nothing to compile.

## Appearance

The site follows `prefers-color-scheme` on first visit and remembers a manual
choice in `localStorage` under `hg-theme`. Flipping the toggle swaps every app
screenshot for its real counterpart, because the light and dark sets both came
out of the same XCUITest run rather than being recoloured. `<picture>` handles
the no-JS case natively via a `prefers-color-scheme` media query on `<source>`.

Anything with the `reveal` class starts at `opacity: 0` **only** when the `js`
class is on `<html>`, so a blocked script can't blank the page.

## Screenshots

The published files are `assets/shots/<screen>-<light|dark>.webp`. To refresh
them:

1. In the HabitGlass repo, run `make reset` (a store with more than three
   habits sends the new-habit test to the paywall instead of the sheet), then
   `make test-ui-light` and `make test-ui-dark`.
2. Export the XCUITest attachments from the resulting `.xcresult` bundles into
   `assets/screens/`, named `home-<appearance>-seeded.png`,
   `detail-<appearance>-1.png`, `detail-<appearance>-2.png`,
   `newhabit-<appearance>-2.png`, `settings-<appearance>-1.png`.
3. Run `./tools/optimise-shots.sh`.

The originals are gitignored on purpose: they're ~2.8 MB each and regenerable.

## Other tools

| Script | What it does |
| --- | --- |
| `tools/optimise-shots.sh` | full-res captures &rarr; the 820px WebP files the site loads |
| `tools/make-og.sh` | renders `tools/og.html` into `assets/og.jpg` (1200&times;630 link preview) |
| `tools/qa-render.sh` | full-page screenshot for design review, with the scroll animations forced on |

`qa-render.sh` exists because headless Chrome's `--virtual-time-budget` never
advances `IntersectionObserver` past its first batch, so a plain screenshot of
the real page shows everything below the fold as blank. It also refuses to size
a window narrower than 500px, which is why narrow layouts get checked in the
iOS Simulator instead:

```bash
xcrun simctl openurl booted "http://localhost:4321/"
xcrun simctl io booted screenshot /tmp/shot.png
```

## Deploying

Push to the default branch. GitHub Pages serves the repository root; `CNAME`
points it at `habitglass.info` and `.nojekyll` skips the Jekyll pass.

## Editing notes

- Design tokens live at the top of `site.css`. `--brand-ramp` is the vivid
  decorative gradient (glows, bubbles, icon tints). `--brand-ramp-text` is the
  contrast-safe one, and it is the only one that may sit under text.
- The legal pages are copies of the ones bundled in the app. Change the wording
  in both places or they'll drift.
- No analytics. Please keep it that way; the privacy page makes a promise about
  it.
