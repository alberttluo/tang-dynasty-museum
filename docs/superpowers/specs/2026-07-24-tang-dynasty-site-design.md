# Tang Dynasty Culture and Art — Design

Date: 2026-07-24

## Purpose

An interactive website showcasing the culture and art of the Tang dynasty (618–907),
written for art and history enthusiasts — people who already visit museums and want
depth and accuracy rather than introductory hand-holding.

The site makes an argument, not just a display: that Tang art records a cosmopolitan
confidence that the An Lushan rebellion of 755 broke, and that the break is visible in
the objects themselves.

## Audience and success criteria

Readers are assumed to know what a dynasty is and to have seen Chinese art before. They
are not assumed to read Chinese.

The site succeeds if a reader can:

- Name what distinguishes high-Tang aesthetics from late-Tang aesthetics, and point at
  objects that show it.
- Explain how sancai glaze behaves and why it looks the way it does.
- Trace at least one imported material or religion from its origin to a surviving Tang
  artifact.
- Read one Tang poem in the original with enough gloss to see its structure.

Every factual claim on the site must be traceable to a cited source. Speculation is
labeled as speculation. Reconstructed pronunciation is labeled as reconstruction.

## Scope

Four content pillars, each with real interactive treatment:

| Pillar | Subject | Interaction engine |
| --- | --- | --- |
| Chang'an and the Silk Road | The capital as a cosmopolitan terminus; trade goods, foreign quarters, imported religions | Layered SVG map |
| Ceramics | Sancai glaze technique, tomb figures, ewers and jars | Annotated deep-zoom |
| Dunhuang and Buddhist art | Cave murals, iconographic registers, donor portraits | Annotated deep-zoom (same engine) |
| Poetry | Li Bai, Du Fu, Wang Wei — a small number of poems read closely | Reading apparatus |

Bound together by a scroll-driven chronological spine covering 618–907.

### Out of scope

- Comprehensive dynastic political history. The timeline covers only what the art needs.
- Audio, video, or voiced pronunciation. See "Poetry room" for why.
- User accounts, comments, search, or any server-side behavior.
- Automated browser testing. See "Testing".

## Architecture

A multi-page static site with no build step and no runtime dependencies. Five HTML
pages: the spine plus four rooms. Not a single-page application.

Rationale:

- Every room has a real, linkable URL (`rooms/ceramics.html#sancai-ewer`). For a site
  whose purpose is showing people specific objects, sharable deep links are a core
  feature, not a nicety.
- Each page loads only its own engine. The poetry room does not download the map code.
- Deployment to GitHub Pages is committing a folder. Nothing to build, nothing that
  rots when a toolchain moves on.
- No router to write, which removes the most common source of avoidable bugs in a site
  of this shape.

Vanilla ES modules and modern CSS throughout.

**Known consequence:** `fetch()` of local JSON is blocked under the `file://` protocol,
so local development requires a server (`python3 -m http.server 8000`) rather than
opening `index.html` directly. This is accepted in preference to inlining all content
into `<script>` tags, which would destroy the data/code separation described below.

## File structure

```
tang-dynasty/
  index.html              # the chronological spine
  rooms/
    changan.html          # Silk Road map
    ceramics.html         # deep-zoom
    dunhuang.html         # deep-zoom (same engine)
    poetry.html           # reading apparatus
  css/
    tokens.css            # design system: color, type, spacing scales
    base.css              # reset, typography, shared layout
    spine.css             # timeline-specific
    room.css              # shared room chrome
  js/
    spine.js
    zoom.js
    map.js
    poem.js
    lib/
      observe.js          # IntersectionObserver helper
      panzoom.js          # pointer-driven transform controller
      data.js             # fetch + validate + report
      dom.js              # small element helpers
  data/
    timeline.json
    objects.json
    routes.json
    poems.json
  assets/
    img/
    img/CREDITS.md        # per-image source, accession, license
    fonts/                # self-hosted CJK serif subset
  tools/
    validate.py           # data and asset integrity check
  docs/
    superpowers/specs/    # this document
  README.md
```

## Data/code boundary

All content lives in `data/*.json`. The engines are generic readers of those files.

Adding an artifact, a hotspot, a map node, or a poem is a data edit and never a code
change. This is the boundary that keeps each JS module small enough to hold in mind, and
it means the site can be extended later without reading any JavaScript.

### Object record (`objects.json`)

```json
{
  "id": "sancai-ewer",
  "room": "ceramics",
  "title": "Sancai-glazed ewer with phoenix head",
  "date": "early 8th century",
  "museum": { "name": "The Met", "accession": "23.180.4", "license": "CC0" },
  "image": { "src": "assets/img/sancai-ewer.jpg", "aspect": "3/4" },
  "summary": "Prose introduction, 2-4 sentences.",
  "hotspots": [
    {
      "x": 0.42,
      "y": 0.18,
      "label": "Phoenix head spout",
      "body": "What this detail is and why it matters.",
      "seeAlso": ["changan.html#sogdian-quarter"]
    }
  ]
}
```

Hotspot coordinates are normalized to the 0–1 range rather than stored in pixels, so
they remain correct at any rendered image size and across every breakpoint.

### Timeline record (`timeline.json`)

```json
{
  "year": 755,
  "era": "rupture",
  "title": "An Lushan rebellion",
  "body": "Prose for this spine section.",
  "objects": ["sancai-ewer"]
}
```

The `era` field is one of `early`, `high`, `rupture`, `late`. It drives the palette via
the mapping in "Design system".

### Route record (`routes.json`)

Nodes carry an id, display name, coordinates in the SVG's own coordinate space, and the
layers they belong to. Edges reference node ids. Layers are `goods`, `religions`, and
`quarters`.

```json
{
  "nodes": [
    {
      "id": "samarkand",
      "name": "Samarkand",
      "x": 210,
      "y": 180,
      "layers": ["goods", "religions"],
      "body": "What arrived in Chang'an from here.",
      "seeAlso": ["ceramics.html#sancai-ewer"]
    }
  ],
  "edges": [{ "from": "samarkand", "to": "dunhuang" }]
}
```

### Poem record (`poems.json`)

```json
{
  "id": "jingyesi",
  "author": "Li Bai",
  "title": "静夜思",
  "titleGloss": "Quiet Night Thoughts",
  "context": "The historical moment behind the poem.",
  "lines": [
    {
      "characters": [
        { "char": "床", "pinyin": "chuáng", "gloss": "bed", "tone": "level" }
      ]
    }
  ],
  "translations": {
    "literal": "...",
    "literary": "..."
  }
}
```

`tone` is one of `level` or `oblique` — the reconstructed *píng/zè* categories, not
modern Mandarin tone numbers.

## Design system

`tokens.css` defines the full scale set once, and two palette registers as CSS custom
properties:

- **High-Tang register:** sancai amber, vermilion, lapis, gold leaf. Warm, saturated,
  confident.
- **Late-Tang register:** ink, celadon, muted stone. Cooler, sparser, more negative
  space.

The 755 rupture is implemented as a **token swap on a scroll-triggered class**, not as
duplicated component styles. One place to tune the shift; every component inherits it.

The four `era` values map onto the two registers as follows. `early` and `high` both use
the high-Tang register — `early` at slightly lower saturation, expressed as a single
token override rather than a third palette. `rupture` is the transitional state applied
only to the 755 section, where both registers are briefly visible against each other.
`late` uses the late-Tang register. Four eras, two palettes, one override.

Type: a serif with genuine CJK coverage for Chinese text (Noto Serif SC, self-hosted as
a subset in `assets/fonts/`), paired with a quieter sans for interface chrome. Fonts are
self-hosted rather than loaded from a font CDN, which would add a third-party runtime
dependency and break offline use.

Both palettes must pass WCAG AA contrast for body text and interactive controls.

## Engines

### `spine.js` — chronological narrative

An `IntersectionObserver` over timeline sections drives a fixed year indicator and swaps
the palette class when the observed section's `era` changes.

- **Scroll is never hijacked.** The page scrolls natively; the observer only reacts.
- Under `prefers-reduced-motion`, transitions become instant and parallax is dropped
  entirely.
- With JavaScript disabled, `index.html` remains a readable chronological essay in the
  high-Tang palette.

### `zoom.js` — annotated deep-zoom

Shared by the ceramics and Dunhuang rooms.

- Pan and zoom via a CSS transform driven by the Pointer Events API — a single code
  path for mouse, touch, and pen rather than a separate touch branch.
- Hotspots render as real `<button>` elements: tab-reachable, each with an accessible
  label, each opening a labeled detail panel.
- Keyboard: arrow keys pan, `+`/`-` zoom, `Esc` closes the panel.
- Below each image, every hotspot also appears in a plain description list, so the
  content is reachable without using the visual interaction at all.
- Zoom is clamped to the image's natural resolution; no upscaling past 1:1.

### `map.js` — Silk Road layers

Inline SVG with hand-authored simplified route geometry. Deliberately not a tile map: a
tile dependency means network calls, eventually an API key, and a third party able to
break the page.

- Layer toggles are plain checkboxes over `goods`, `religions`, and `quarters`.
- Nodes are focusable buttons. Selecting one lists what arrived from there and
  **deep-links to the artifacts in other rooms that evidence it**.
- The geographic simplification is stated on the page. It is a schematic, not a
  cartographically accurate map, and says so.

This cross-linking is what makes the four rooms one site rather than four separate toys.

### `poem.js` — reading apparatus

- Per-character gloss revealed on hover **and on focus**. Hover-only would exclude
  keyboard and touch users entirely.
- One toggle overlays the reconstructed *píng/zè* pattern as marks beneath each line.
- A second toggle switches between literal and literary translation.
- Visible prose names the reconstruction and states its limits.

**Deliberate editorial scope:** the room presents reconstructed level/oblique tone
categories only. It does not claim to voice 8th-century pronunciation and includes no
audio. Middle Chinese phonology is a live scholarly matter, and implying we can
pronounce it would be the kind of error that discredits the accurate material
surrounding it.

## Error handling

Rooms are progressively enhanced, so failure is visible and bounded rather than silent.

- Each room's HTML ships a static fallback — the photograph, its caption, the poem text.
  JavaScript layers interaction on top of content that is already there.
- A failed `fetch` renders an inline message in place of the module. Errors are never
  console-only, and a broken module never leaves a blank section with no explanation.
- Aspect-ratio boxes reserve image space, so a missing file degrades to alt text without
  layout shift or collapse.
- `lib/data.js` validates each record against its expected shape on load. Malformed
  records are skipped and named in a visible notice rather than thrown, so one bad comma
  cannot take down a whole room.
- Hotspots whose `seeAlso` target does not exist are rendered without the link rather
  than producing a dead link.

## Images and licensing

Sources: Metropolitan Museum, Cleveland Museum of Art, and Smithsonian open access
collections (CC0 or public domain).

- Images are downloaded into `assets/img/` and optimized. **Museum servers are never
  hotlinked** — hotlinking breaks over time and several institutions' terms prohibit it.
- `assets/img/CREDITS.md` records, per file: source institution, accession number,
  license, and the page it was obtained from.
- Any image whose license cannot be positively verified does not ship. It is replaced by
  a marked placeholder and an entry in the download manifest.

**Contingency:** if network access is unavailable during the build, the full structure is
built against clearly marked placeholders, and the deliverable includes an exact
download manifest listing every needed image with its source URL.

## Accessibility

Non-negotiable, verified per room:

- `prefers-reduced-motion` honored everywhere motion exists.
- Every interactive element is a real button, link, or input with a visible focus ring.
- Both palettes pass WCAG AA contrast for body text and controls.
- All deep-zoom and map content is reachable by keyboard, and duplicated in text form
  below the visual interaction.
- Chinese text carries `lang="zh-Hans"`; the page carries `lang="en"`.
- Images have meaningful alt text describing the object, not the filename.

## Testing

No test framework. Adding one means adding a Node toolchain to a site that deliberately
has no build step, and the failures it would catch are not the failures likely to occur.

**`tools/validate.py`** — the automated layer. Validates every JSON file against its
expected shape, asserts that every referenced image file exists, checks that hotspot
coordinates fall within 0–1, and checks that every `seeAlso` target resolves to a real
page and anchor. This catches bad data and missing assets, which are the realistic
breakages.

**Per-room manual QA checklist** — run for each room before its commit:

1. Keyboard-only pass: reach and operate every control, no trapped focus.
2. Reduced-motion pass: with the OS setting on, no animation or parallax occurs.
3. Narrow-viewport pass: 360px wide, no horizontal scroll, no clipped controls.
4. JS-disabled pass: content is readable and images render.
5. Broken-data pass: temporarily corrupt the room's JSON and confirm a visible inline
   message rather than a blank section.

To be explicit: there is no automated browser testing in this project, so the manual
checklist is load-bearing and must actually be run.

## Build order

A tracer bullet first, then rooms one at a time.

1. **Tracer:** `tokens.css`, `base.css`, the spine skeleton with three timeline
   sections, and exactly one artifact working end-to-end through `zoom.js`. Verified in
   a browser and committed before anything is broadened.
2. `tools/validate.py` and the README, including the `python3 -m http.server` note.
3. Ceramics room, full object set.
4. Chang'an room and the map engine.
5. Dunhuang room, reusing `zoom.js` unchanged. If it cannot be reused unchanged, that is
   a signal the engine's interface is wrong and should be fixed rather than forked.
6. Poetry room.
7. Cross-link pass: wire every `seeAlso` and verify with the validator.

## Deployment

GitHub Pages, serving the repository root. No workflow file needed — Pages can serve a
branch directly, and the site has no build step.

**Commits contain no AI attribution.** No `Co-Authored-By` trailers, no generated-with
notes, plain descriptive messages.

**Nothing is pushed.** Publishing to a remote is left entirely to the repository owner.
