#!/usr/bin/env python3
"""Regenerate the no-JavaScript fallback inside the two deep-zoom rooms.

The zoom rooms build their content with JavaScript, so without it the pages
would be empty. Rather than hand-maintain a duplicate copy of every object --
which drifts the moment someone edits data/objects.json -- the fallback is
generated from that file and written between two markers in each room page.

Run from the repository root after changing data/objects.json:

    python3 tools/build_fallback.py

It rewrites only the text between the markers, so hand edits elsewhere in the
page survive. `tools/validate.py` checks that the generated block is current.
"""
import html
import json
import re
import sys
from pathlib import Path

START = "<!-- BEGIN generated fallback: python3 tools/build_fallback.py -->"
END = "<!-- END generated fallback -->"

ROOMS = {"ceramics": "rooms/ceramics.html", "dunhuang": "rooms/dunhuang.html"}


def build_block(records, room):
    objects = [r for r in records if r.get("room") == room]
    out = [
        START,
        "  <noscript>",
        '    <p class="notice">The interactive zoom needs JavaScript. Every object,',
        "    its full caption, and each annotated detail are given as text below.</p>",
    ]
    for record in objects:
        museum = record.get("museum") or {}
        meta = " · ".join(
            str(v)
            for v in (
                record.get("date"),
                museum.get("name"),
                museum.get("accession"),
                museum.get("license"),
            )
            if v
        )
        image = record.get("image") or {}
        out += [
            f'    <figure class="object" id="{html.escape(record["id"])}-static">',
            f'      <img src="{html.escape(image.get("src", ""))}"'
            f' alt="{html.escape(record.get("title", ""))}"'
            f' style="aspect-ratio: {html.escape(str(image.get("aspect", "1/1")))}">',
            "      <figcaption>",
            f'        <h2>{html.escape(record.get("title", ""))}</h2>',
            f'        <p class="object-meta">{html.escape(meta)}</p>',
            f'        <p class="prose">{html.escape(record.get("summary", ""))}</p>',
            "      </figcaption>",
            '      <dl class="hotspot-list">',
        ]
        for spot in record.get("hotspots") or []:
            out.append(f'        <dt>{html.escape(spot.get("label", ""))}</dt>')
            out.append(f'        <dd>{html.escape(spot.get("body", ""))}</dd>')
        out += ["      </dl>", "    </figure>"]
    out += ["  </noscript>", END]
    return "\n".join(out)


def main():
    repo_root = Path(__file__).resolve().parent.parent
    records = json.loads((repo_root / "data" / "objects.json").read_text(encoding="utf-8"))
    check_only = "--check" in sys.argv[1:]
    stale = []

    for room, relpath in ROOMS.items():
        path = repo_root / relpath
        page = path.read_text(encoding="utf-8")
        block = build_block(records, room)

        if START not in page or END not in page:
            print(f"{relpath}: markers not found; cannot generate fallback")
            return 1

        pattern = re.compile(re.escape(START) + ".*?" + re.escape(END), re.S)
        updated = pattern.sub(lambda _: block, page)

        if updated == page:
            print(f"{relpath}: already current")
            continue
        if check_only:
            stale.append(relpath)
            continue
        path.write_text(updated, encoding="utf-8")
        count = len([r for r in records if r.get("room") == room])
        print(f"{relpath}: regenerated ({count} objects)")

    if stale:
        print("\nStale fallback in: " + ", ".join(stale))
        print("Run: python3 tools/build_fallback.py")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
