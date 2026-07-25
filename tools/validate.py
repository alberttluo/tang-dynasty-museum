#!/usr/bin/env python3
"""Validate the site's data files and referenced assets.

Authoritative validator. The runtime check in js/lib/data.js is deliberately
lighter — its job is skipping one bad record, not gatekeeping a commit.

Run from the repository root:  python3 tools/validate.py
"""
import json
import sys
from pathlib import Path

ERAS = {"early", "high", "rupture", "late"}
ROOMS = {"ceramics", "dunhuang"}
LAYERS = {"goods", "religions", "quarters"}
TONES = {"level", "oblique"}
FIRST_YEAR, LAST_YEAR = 618, 907


def _resolve(src, repo_root):
    """Image paths in objects.json are written relative to rooms/."""
    return (repo_root / "rooms" / src).resolve()


def check_objects(records, repo_root):
    problems = []
    seen = set()

    for index, record in enumerate(records):
        where = f"objects[{index}] ({record.get('id', 'no id')})"

        for field in ("id", "room", "title", "summary"):
            if not record.get(field):
                problems.append(f"{where}: missing {field}")

        record_id = record.get("id")
        if record_id in seen:
            problems.append(f"{where}: duplicate id {record_id!r}")
        seen.add(record_id)

        if record.get("room") not in ROOMS:
            problems.append(f"{where}: room must be one of {sorted(ROOMS)}")

        museum = record.get("museum") or {}
        for field in ("name", "accession", "license"):
            if not museum.get(field):
                problems.append(f"{where}: missing museum.{field}")

        src = (record.get("image") or {}).get("src")
        if not src:
            problems.append(f"{where}: missing image.src")
        elif not _resolve(src, repo_root).is_file():
            problems.append(f"{where}: image file not found: {src}")

        hotspots = record.get("hotspots")
        if not isinstance(hotspots, list):
            problems.append(f"{where}: hotspots must be a list")
            continue

        for spot_index, spot in enumerate(hotspots):
            spot_where = f"{where} hotspot[{spot_index}]"
            if not spot.get("label"):
                problems.append(f"{spot_where}: missing label")
            for axis in ("x", "y"):
                value = spot.get(axis)
                if not isinstance(value, (int, float)) or not 0 <= value <= 1:
                    problems.append(f"{spot_where}: {axis} must be within 0-1")

    return problems


def check_timeline(records):
    problems = []
    years = []

    for index, record in enumerate(records):
        where = f"timeline[{index}]"
        year = record.get("year")

        if not isinstance(year, int):
            problems.append(f"{where}: year must be an integer")
        elif not FIRST_YEAR <= year <= LAST_YEAR:
            problems.append(f"{where}: year {year} outside {FIRST_YEAR}-{LAST_YEAR}")
        else:
            years.append(year)

        if record.get("era") not in ERAS:
            problems.append(f"{where}: era must be one of {sorted(ERAS)}")

        for field in ("title", "body"):
            if not record.get(field):
                problems.append(f"{where}: missing {field}")

        if not isinstance(record.get("objects"), list):
            problems.append(f"{where}: objects must be a list")

    if years != sorted(years):
        problems.append("timeline: sections must be in ascending year order")

    return problems


def check_routes(data):
    problems = []
    nodes = data.get("nodes") or []
    ids = set()

    for index, node in enumerate(nodes):
        where = f"routes.nodes[{index}] ({node.get('id', 'no id')})"

        for field in ("id", "name", "body"):
            if not node.get(field):
                problems.append(f"{where}: missing {field}")

        if node.get("id") in ids:
            problems.append(f"{where}: duplicate id")
        ids.add(node.get("id"))

        for axis in ("x", "y"):
            if not isinstance(node.get(axis), (int, float)):
                problems.append(f"{where}: {axis} must be a number")

        layers = node.get("layers")
        if not isinstance(layers, list) or not layers:
            problems.append(f"{where}: layers must be a non-empty list")
        else:
            for layer in layers:
                if layer not in LAYERS:
                    problems.append(f"{where}: unknown layer {layer!r}")

    for index, edge in enumerate(data.get("edges") or []):
        for end in ("from", "to"):
            target = edge.get(end)
            if target not in ids:
                problems.append(f"routes.edges[{index}]: {end} references unknown node {target!r}")

    return problems


def check_poems(records):
    problems = []

    for index, record in enumerate(records):
        where = f"poems[{index}] ({record.get('id', 'no id')})"

        for field in ("id", "author", "title", "titleGloss", "context"):
            if not record.get(field):
                problems.append(f"{where}: missing {field}")

        translations = record.get("translations") or {}
        for kind in ("literal", "literary"):
            if not translations.get(kind):
                problems.append(f"{where}: missing {kind} translation")

        lines = record.get("lines")
        if not isinstance(lines, list) or not lines:
            problems.append(f"{where}: lines must be a non-empty list")
            continue

        for line_index, line in enumerate(lines):
            characters = line.get("characters")
            if not isinstance(characters, list) or not characters:
                problems.append(f"{where} line[{line_index}]: characters must be a non-empty list")
                continue

            for char_index, char in enumerate(characters):
                char_where = f"{where} line[{line_index}] char[{char_index}]"
                value = char.get("char")
                if not value:
                    problems.append(f"{char_where}: missing char")
                elif len(value) != 1:
                    problems.append(f"{char_where}: char must be a single character")
                if not char.get("gloss"):
                    problems.append(f"{char_where}: missing gloss")
                if char.get("tone") not in TONES:
                    problems.append(
                        f"{char_where}: tone must be {sorted(TONES)} "
                        "(reconstructed ping/ze, not numeric Mandarin tones)"
                    )

    return problems


def check_crosslinks(objects, routes, timeline, repo_root):
    """Verify every seeAlso target resolves to a real page and anchor.

    Anchors correspond to object ids, which js/zoom.js sets as each figure's
    id. A link like 'ceramics.html#jar' is valid iff object 'jar' exists.
    """
    problems = []
    object_ids = {record.get("id") for record in objects}

    def check_link(link, where):
        page, _, anchor = link.partition("#")
        if page and not (repo_root / "rooms" / page).is_file():
            problems.append(f"{where}: link target page not found: {page}")
            return
        if anchor and anchor not in object_ids:
            problems.append(f"{where}: link anchor #{anchor} matches no object id")

    for record in objects:
        for index, spot in enumerate(record.get("hotspots") or []):
            for link in spot.get("seeAlso") or []:
                check_link(link, f"objects[{record.get('id')}] hotspot[{index}]")

    for node in routes.get("nodes") or []:
        for link in node.get("seeAlso") or []:
            check_link(link, f"routes node[{node.get('id')}]")

    for index, section in enumerate(timeline):
        for object_id in section.get("objects") or []:
            if object_id not in object_ids:
                problems.append(
                    f"timeline[{index}]: references unknown object {object_id!r}"
                )

    return problems


def _load(path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def main(argv=None):
    """Validate all data files.

    A missing data file is tolerated by default so the validator stays usable
    while the site is still being built, but it is never reported as success --
    see the summary at the end. Pass --strict once every file should exist (the
    finished site, or CI) to turn a missing file into a failure.
    """
    argv = sys.argv[1:] if argv is None else argv
    strict = "--strict" in argv

    repo_root = Path(__file__).resolve().parent.parent
    data_dir = repo_root / "data"
    problems = []
    missing = []

    checks = [
        ("objects.json", lambda d: check_objects(d, repo_root)),
        ("timeline.json", check_timeline),
        ("routes.json", check_routes),
        ("poems.json", check_poems),
    ]

    for filename, check in checks:
        path = data_dir / filename
        if not path.is_file():
            missing.append(filename)
            if strict:
                problems.append(f"{filename}: required data file is missing")
            else:
                print(f"skipped {filename} (not created yet)")
            continue
        try:
            problems.extend(check(_load(path)))
        except json.JSONDecodeError as error:
            problems.append(f"{filename}: invalid JSON — {error}")

    # Cross-file checks need several files at once, so they run separately.
    def _maybe(name, fallback):
        path = data_dir / name
        if not path.is_file():
            return fallback
        try:
            return _load(path)
        except json.JSONDecodeError:
            return fallback  # already reported above

    problems.extend(
        check_crosslinks(
            _maybe("objects.json", []),
            _maybe("routes.json", {"nodes": []}),
            _maybe("timeline.json", []),
            repo_root,
        )
    )

    if problems:
        print(f"{len(problems)} problem(s) found:\n")
        for problem in problems:
            print(f"  - {problem}")
        return 1

    # Never claim success without saying what was not checked -- a green result
    # from an empty data/ directory would hide a deleted file.
    if missing:
        print(
            f"\nNo problems in the files that exist, but {len(missing)} data file(s) "
            f"were not checked because they are absent: {', '.join(missing)}."
        )
        print("Run with --strict to require them.")
        return 0

    print("All data files valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
