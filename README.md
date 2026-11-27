# whiteout-survival-playable

An HTML5 playable in the "arcade idle" style: walk a survivor around a snowy yard, carry logs and coal to the counters, collect the cash, buy the upgrade, reach the end card. About 25 seconds of play.

## Play

Open `index.html` in any modern browser (phone, tablet or computer). It is one self-contained file: script, styles and fonts are inlined and it makes no network requests.

- Touch or mouse: press anywhere and drag to move.
- Keyboard: W A S D or the arrow keys. On the end card, Enter, Space or R replays.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | The built playable, 673,432 bytes, sha256 `e2a9804ede33da484375bedaf8a58c7ea5bc21f9a33b9b5c65c193bc9263eaf2` |
| `source/src/` | Game source (Three.js r170 scene built in code, DOM/CSS/SVG HUD, WebAudio sound effects) |
| `source/build.mjs` | esbuild script that bundles everything into `source/dist/index.html` |
| `source/tools-*.mjs`, `source/run-matrix.sh` | Headless-Chrome scripts that play the build from start to end card with real input events |
| `source/assets/fonts/` | Lilita One and Russo One (SIL OFL, licences included) |

## Build

```bash
cd source
npm ci
node build.mjs          # writes source/dist/index.html
cmp dist/index.html ../index.html
```

The build is reproducible: with the locked dependencies it produces a file byte-identical to `index.html`.

## Test

```bash
cd source
npm ci
node tools-play.mjs --file ../index.html --w 390 --h 844 --dpr 3 --input touch --replay
./run-matrix.sh         # all viewports, results in source/verify-out
```

The scripts expect Chrome at `/usr/local/bin/google-chrome`. `--url http://127.0.0.1:8000/` plays a served copy instead of a file.

The build keeps two aids the scripts use: `?q=0|1|2` pins the render quality, and `window.__playable` exposes the game state for frame-exact stepping. Neither reaches a server; the page has none.

## Notes

The "Whiteout Survival" name and logo and the App Store and Google Play badges shown on the end card are trademarks of their owners. The end card's buttons only play a tap sound; no store link is wired.
