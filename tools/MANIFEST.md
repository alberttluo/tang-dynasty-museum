# Image download manifest

What is missing, weak, or still wanted. Every placeholder or compromise on the site
should have a row here.

## Network constraint on this build

The Metropolitan Museum's API and image host (`collectionapi.metmuseum.org`,
`images.metmuseum.org`) are **unreachable from the build network** — a corporate
allowlist, not an outage; `api.github.com` and Wikimedia both resolve fine. The plan
originally specified the Met API as the source. Wikimedia Commons was used instead,
with licences read from the Commons API rather than the Met's `isPublicDomain` field.

If you rebuild somewhere with open network access, the Met is the better source: higher
resolution, cleaner studio photography, and an explicit per-object public-domain flag.

## Wanted but not acquired

| Intended subject | Room | Why not shipped | Where to look |
| --- | --- | --- | --- |
| Xing ware white porcelain | ceramics | Searched Commons for `Xing ware white porcelain Tang`; the acceptable-licence matches were actually celadon, not Xing white ware. Rather than mislabel the object, the slot was filled with a correctly-named celadon bottle. | Met accession group for Xing ware; Freer/Smithsonian open access |
| Sancai-glazed jar or amphora | ceramics | Not attempted after the ewer covered the vessel category. Would strengthen the vessel-form range. | Cleveland open access (CC0), Commons |
| High-resolution Dunhuang cave mural | dunhuang | `dunhuang-mural.png` is only 640x397 — genuine and public domain, but too small for satisfying deep-zoom. Most higher-resolution Mogao photography on Commons is CC BY-SA or unlicensed. | Dunhuang Academy digital archive; Smithsonian open access |
| A third Buddhist-art object | dunhuang | Only two acceptable-licence Buddhist works were found, so this room is thinner than the ceramics room. | Cleveland open access, Smithsonian `ids.si.edu` |

## Deferred: self-hosted CJK font

The plan's Task 11 Step 8 called for subsetting Noto Serif SC and self-hosting it. Not
done: the Noto release host is unreachable on this network and `fonttools` is not
installed (PyPI also unreachable). The site therefore relies on the system CJK fallback
in `css/tokens.css` — `"Noto Serif SC", "Songti SC", "SimSun"`, behind Latin faces.

Verified rendering correctly on Windows via SimSun. **Not verified on Linux or Android**,
where no CJK serif may be installed and characters could fall back to a sans face or, in
the worst case, render as tofu boxes. Subsetting and self-hosting the font is the fix and
should be done before treating the poetry room as finished for a general audience.

## Licence policy applied

Accepted only `Public domain`, `CC0`, or `PD-*` as reported by the Commons API at
download time. `CC BY` and `CC BY-SA` files were rejected — legally reusable, but this
site's credit format carries no attribution field, and shipping them would create an
unmet obligation. See `assets/img/CREDITS.md` for what shipped.
