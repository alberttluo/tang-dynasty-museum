# Tang Dynasty — Culture and Art

An interactive static site on the culture and art of the Tang dynasty (618–907),
built for an audience that already reads museum labels.

## Running locally

This site uses `fetch()` to load content from `data/*.json`, which browsers block
under the `file://` protocol. Serve it over HTTP:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. Opening `index.html` directly will leave the
interactive rooms empty.

## Structure

- `index.html` — the chronological spine, 618–907
- `rooms/` — four pillar rooms, each a real linkable page
- `data/` — all content. Adding an artifact, map node, or poem is a data edit.
- `js/` — one module per room, shared helpers in `js/lib/`
- `tools/validate.py` — data and asset integrity check

## Adding content

Edit the relevant file in `data/`, then run the validator:

```bash
python3 tools/validate.py
```

It checks record shape, that every referenced image exists, that hotspot
coordinates are within 0-1, that every cross-link resolves to a real page and
anchor, and that the generated no-JavaScript fallback is not stale. Run it
before every commit. Add `--strict` to also require that every data file
exists, which is what you want in CI.

If you change `data/objects.json`, regenerate the no-JavaScript fallback that
the two zoom rooms carry:

```bash
python3 tools/build_fallback.py
```

The validator fails until you do. Run the unit tests with:

```bash
cd tools && python3 -m unittest discover -s .
```

## Deploying

The site has no build step, so GitHub Pages can serve the repository root
directly: repository Settings → Pages → deploy from branch, root folder.

## No build step

There is intentionally no `package.json`, bundler, or transpiler. Please keep it
that way — the site is meant to still run untouched in ten years.
