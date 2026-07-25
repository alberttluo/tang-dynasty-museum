# Tang Dynasty Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive static website showcasing Tang dynasty (618–907) culture and art for an enthusiast audience, with a scroll-driven chronological spine and four interactive pillar rooms.

**Architecture:** Five static HTML pages (spine + four rooms) with no build step and no runtime dependencies. All content lives in `data/*.json`; the JavaScript modules are generic readers of those files. Rooms are progressively enhanced — each ships a static HTML fallback and layers interaction on top. The 755 An Lushan rupture is expressed as a CSS custom-property palette swap triggered by scroll position.

**Tech Stack:** Vanilla ES modules, modern CSS (custom properties, `aspect-ratio`, container-free grid/flex), inline SVG, Pointer Events API, IntersectionObserver. Python 3 stdlib for the data validator and local dev server. No npm, no bundler, no framework.

**Source spec:** `docs/superpowers/specs/2026-07-24-tang-dynasty-site-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **No build step.** Never add `package.json`, a bundler, a transpiler, or a Node toolchain. If a task seems to need one, stop and report instead.
- **No runtime dependencies.** No CDN scripts, no external stylesheets, no font CDN, no map tile provider. Everything is served from this repository.
- **Local dev requires a server:** `python3 -m http.server 8000`, then open `http://localhost:8000/`. `fetch()` of local JSON is blocked under `file://`. Never work around this by inlining content into `<script>` tags.
- **Museum servers are never hotlinked.** Images are downloaded into `assets/img/` and committed.
- **Any image whose license cannot be positively verified does not ship.** It gets a marked placeholder and an entry in the download manifest instead.
- **`assets/img/CREDITS.md` records, per file:** source institution, accession number, license, and the page URL it was obtained from.
- **Hotspot coordinates are normalized to the 0–1 range**, never pixels.
- **`tone` values are `level` or `oblique` only** — reconstructed *píng/zè* categories, never modern Mandarin tone numbers.
- **No audio anywhere on the site**, and no claim to voice 8th-century pronunciation.
- **Both palettes must pass WCAG AA contrast** for body text and interactive controls.
- **`prefers-reduced-motion` is honored everywhere motion exists.**
- **Every interactive element is a real `<button>`, `<a>`, or `<input>`** with a visible focus ring. Never a click-handled `<div>`.
- **Chinese text carries `lang="zh-Hans"`;** the page element carries `lang="en"`.
- **Commits contain no AI attribution.** No `Co-Authored-By` trailers, no "generated with" notes. Plain descriptive messages.
- **Nothing is pushed to any remote, ever.** No `git push`, no `git remote add`. Publishing is the repository owner's decision alone.
- **`.omc/` is gitignored** and must stay untracked.

### A note on fabricated data

The spec's JSON examples contain an illustrative accession number (`23.180.4`) and illustrative coordinates. **These are placeholders for document structure, not verified facts.** Every accession number, museum attribution, and license that ships in `data/objects.json` must come from an actual API response or collection page recorded at the time of download. Never copy an example value into shipped data, and never invent an accession number. If you cannot verify a record, it does not ship.

### Testing approach, and its honest limits

The spec deliberately excludes a JS test framework, because adding one means adding a Node toolchain to a site that has no build step. This plan therefore uses two verification layers:

1. **`tools/validate.py`** — real automated tests. It is developed test-first with Python's stdlib `unittest` (no `pip install`). It catches the failures that will realistically occur: malformed data, missing image files, out-of-range coordinates, dead cross-links.
2. **Scripted browser verification** — each JS task ends with numbered browser actions and the exact expected observation. These are load-bearing and must actually be performed, not assumed. A task is not complete if its verification steps were skipped.

There is no automated browser testing in this project. Do not claim a room "works" without running its verification steps.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `index.html` | The chronological spine. Readable as a static essay with JS off. |
| `rooms/ceramics.html` | Ceramics room shell + static fallback content. |
| `rooms/changan.html` | Chang'an/Silk Road room shell + static fallback. |
| `rooms/dunhuang.html` | Dunhuang room shell + static fallback. |
| `rooms/poetry.html` | Poetry room shell + static fallback (full poem text). |
| `css/tokens.css` | The only place colors, type scale, and spacing are defined. Both palette registers. |
| `css/base.css` | Reset, typography, focus rings, shared layout primitives. |
| `css/spine.css` | Timeline-specific layout and the era transition. |
| `css/room.css` | Shared room chrome: header, detail panel, description lists. |
| `js/spine.js` | Observes timeline sections, drives year indicator and palette class. |
| `js/zoom.js` | Annotated deep-zoom room controller. Shared by ceramics and Dunhuang. |
| `js/map.js` | Silk Road SVG map controller: layer toggles, node selection. |
| `js/poem.js` | Poetry reading apparatus: gloss, tone overlay, translation toggle. |
| `js/lib/dom.js` | Element creation and query helpers. No app logic. |
| `js/lib/data.js` | Fetch + parse + light shape check + visible failure rendering. |
| `js/lib/panzoom.js` | Pointer-driven transform controller. Knows nothing about hotspots. |
| `js/lib/observe.js` | IntersectionObserver wrapper. Knows nothing about eras. |
| `data/timeline.json` | Spine sections. |
| `data/objects.json` | Artifact records with hotspots, for both zoom rooms. |
| `data/routes.json` | Map nodes, edges, layers. |
| `data/poems.json` | Poems with per-character gloss and tone class. |
| `tools/validate.py` | Data and asset integrity checks. Authoritative validator. |
| `tools/test_validate.py` | Unit tests for the validator. |
| `assets/img/CREDITS.md` | Per-image provenance and license. |
| `README.md` | How to run locally, how to add content, how to deploy. |

**Validation lives in two places by design.** `tools/validate.py` is authoritative and exhaustive — it is the pre-commit gate. `js/lib/data.js` does only light shape checks at runtime so one malformed record can be skipped instead of killing a room. Do not attempt to share validation logic between Python and JavaScript; the duplication is deliberate and the two have different jobs.

---

## Task 1: Repository scaffold and design tokens

**Files:**
- Create: `css/tokens.css`
- Create: `css/base.css`
- Create: `index.html` (minimal shell, replaced in Task 2)
- Create: `README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: CSS custom properties consumed by every later task. Body-level era classes `era-early`, `era-high`, `era-rupture`, `era-late`. Utility classes `.wrap`, `.prose`, `.visually-hidden`.

- [ ] **Step 1: Create `css/tokens.css`**

The four `era` values map onto two palette registers: `early` and `high` share the high-Tang register with `early` at reduced saturation via one override; `rupture` is a transitional state; `late` uses the late-Tang register.

```css
:root {
  /* Type scale */
  --font-serif: "Noto Serif SC", "Songti SC", "SimSun", Georgia, serif;
  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --size-step--1: clamp(0.83rem, 0.8rem + 0.15vw, 0.9rem);
  --size-step-0: clamp(1rem, 0.96rem + 0.2vw, 1.12rem);
  --size-step-1: clamp(1.25rem, 1.15rem + 0.5vw, 1.55rem);
  --size-step-2: clamp(1.6rem, 1.4rem + 1vw, 2.2rem);
  --size-step-3: clamp(2rem, 1.6rem + 2vw, 3.2rem);
  --measure: 66ch;

  /* Spacing scale */
  --space-3xs: 0.25rem;
  --space-2xs: 0.5rem;
  --space-xs: 0.75rem;
  --space-s: 1rem;
  --space-m: 1.5rem;
  --space-l: 2.5rem;
  --space-xl: 4rem;
  --space-2xl: 6rem;

  /* Motion */
  --era-transition: 900ms ease;

  /* High-Tang register (default) */
  --ink: #241a12;
  --paper: #f6efe3;
  --paper-raised: #fffaf1;
  --accent: #a8321e;          /* vermilion */
  --accent-2: #c2871a;        /* sancai amber */
  --accent-3: #2c4a72;        /* lapis */
  --gold: #9a7726;
  --rule: #d6c7ad;
  --muted: #5c4b3a;
  --saturation-scale: 1;
}

/* early Tang: same register, lower saturation */
body.era-early {
  --accent: #97402f;
  --accent-2: #a8853d;
  --rule: #d2c7b4;
}

/* late Tang: cooler, sparser */
body.era-late {
  --ink: #1d2320;
  --paper: #eef0ec;
  --paper-raised: #f7f8f6;
  --accent: #3f5c52;          /* celadon */
  --accent-2: #6b7b72;
  --accent-3: #2f3a44;
  --gold: #7d7f6e;
  --rule: #c3c9c3;
  --muted: #4a544e;
}

body.era-rupture {
  --accent: #8c3b2a;
  --rule: #b9a894;
}

@media (prefers-reduced-motion: reduce) {
  :root { --era-transition: 0ms; }
}
```

- [ ] **Step 2: Check the two palettes for WCAG AA contrast before building on them**

Contrast failures are far cheaper to fix now than after five pages inherit them.

Compute the ratios for the pairs that carry text, in both registers:

```bash
python3 - <<'PY'
def luminance(hex_color):
    channels = [int(hex_color[i:i+2], 16) / 255 for i in (1, 3, 5)]
    linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]

def ratio(fg, bg):
    a, b = luminance(fg), luminance(bg)
    lighter, darker = max(a, b), min(a, b)
    return (lighter + 0.05) / (darker + 0.05)

pairs = {
    "high: ink on paper":     ("#241a12", "#f6efe3"),
    "high: accent on paper":  ("#a8321e", "#f6efe3"),
    "high: muted on paper":   ("#5c4b3a", "#f6efe3"),
    "early: accent on paper": ("#97402f", "#f6efe3"),
    "late: ink on paper":     ("#1d2320", "#eef0ec"),
    "late: accent on paper":  ("#3f5c52", "#eef0ec"),
    "late: muted on paper":   ("#4a544e", "#eef0ec"),
}
for name, (fg, bg) in pairs.items():
    value = ratio(fg, bg)
    print(f"{value:5.2f}  {'PASS' if value >= 4.5 else 'FAIL'}  {name}")
PY
```

Every pair must reach 4.5:1, the AA threshold for body text. Any pair that prints FAIL means darkening that token in `tokens.css` and re-running until it passes. Do not proceed with a failing pair — Task 12's site-wide contrast check will only rediscover it after every page depends on it.

- [ ] **Step 3: Create `css/base.css`**

```css
*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; }

html { -webkit-text-size-adjust: 100%; }

body {
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: var(--size-step-0);
  line-height: 1.6;
  transition: background-color var(--era-transition), color var(--era-transition);
}

img, svg { display: block; max-width: 100%; }

h1, h2, h3 { line-height: 1.15; text-wrap: balance; font-weight: 600; }
h1 { font-size: var(--size-step-3); }
h2 { font-size: var(--size-step-2); }
h3 { font-size: var(--size-step-1); }

p, li { text-wrap: pretty; }

a { color: var(--accent); text-underline-offset: 0.15em; }

:where(a, button, input, [tabindex]):focus-visible {
  outline: 3px solid var(--accent-3);
  outline-offset: 2px;
  border-radius: 2px;
}

.wrap { width: min(100% - 2rem, 72rem); margin-inline: auto; }
.prose { max-width: var(--measure); }
.prose > * + * { margin-block-start: var(--space-s); }

.visually-hidden {
  position: absolute; width: 1px; height: 1px;
  padding: 0; overflow: hidden; clip-path: inset(50%);
  white-space: nowrap; border: 0;
}

.lang-zh { font-family: var(--font-serif); }

.notice {
  border-inline-start: 4px solid var(--accent);
  background: var(--paper-raised);
  padding: var(--space-s);
  font-family: var(--font-sans);
  font-size: var(--size-step--1);
}
```

Note the font stack falls back to system CJK fonts (`Songti SC`, `SimSun`). The self-hosted Noto Serif SC subset is added in Task 10, once `poems.json` exists and the required character set is known. Do not attempt to subset a font before there is content to subset against.

- [ ] **Step 4: Create a minimal `index.html` to verify the tokens load**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tang Dynasty — Culture and Art</title>
<link rel="stylesheet" href="css/tokens.css">
<link rel="stylesheet" href="css/base.css">
</head>
<body class="era-high">
<main class="wrap prose">
  <h1>Tang Dynasty</h1>
  <p>Token check. This paragraph should be dark warm brown on warm cream.</p>
  <p><a href="#">A link, which should be vermilion.</a></p>
  <button type="button">A button, which should show a lapis focus ring on Tab.</button>
</main>
</body>
</html>
```

- [ ] **Step 5: Verify in the browser**

Run: `python3 -m http.server 8000` from the repository root, then open `http://localhost:8000/`.

Verify each of these:
1. Background is warm cream, not white.
2. The link renders vermilion red, not default blue.
3. Pressing Tab focuses the button and shows a **visible** blue-slate outline offset from the button edge.
4. In devtools, add `era-late` to `<body>` in place of `era-high`. Background shifts to cool grey-green and the link turns celadon. No property shows as invalid.
5. Remove all classes from `<body>`. Page still renders in the high-Tang register (the `:root` defaults), not unstyled.

- [ ] **Step 6: Create `README.md`**

````markdown
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
coordinates are within 0–1, and that every cross-link resolves. Run it before
every commit.

## Deploying

The site has no build step, so GitHub Pages can serve the repository root
directly: repository Settings → Pages → deploy from branch, root folder.

## No build step

There is intentionally no `package.json`, bundler, or transpiler. Please keep it
that way — the site is meant to still run untouched in ten years.
````

- [ ] **Step 7: Create `.gitignore` check and commit**

`.gitignore` already exists from the spec commit and lists `.omc/`. Confirm with `git status --short` that no `.omc/` paths appear.

```bash
git add css/tokens.css css/base.css index.html README.md
git commit -m "Add design tokens, base styles, and project readme

Two palette registers as custom properties: high-Tang warm and late-Tang
cool. Era classes on body select the register so the 755 shift is a token
swap rather than duplicated component styles."
```

---

## Task 2: Spine as a static essay (no JavaScript)

Progressive enhancement means the readable version comes first. This task ships a complete, readable chronological essay that needs no JS at all.

**Files:**
- Create: `data/timeline.json`
- Modify: `index.html` (replace the token-check shell entirely)
- Create: `css/spine.css`

**Interfaces:**
- Consumes: tokens and utility classes from Task 1.
- Produces: `data/timeline.json` with records shaped `{ year: number, era: "early"|"high"|"rupture"|"late", title: string, body: string, objects: string[] }`. DOM contract for Task 3: each spine section is `<section class="era-section" data-era="..." data-year="...">`, and the year indicator is `<div id="year-indicator" aria-live="polite">`.

- [ ] **Step 1: Create `data/timeline.json` with seven sections**

Prose must be accurate. Keep each `body` to 3–5 sentences. `objects` may be an empty array for now; Task 11 wires them.

```json
[
  {
    "year": 618,
    "era": "early",
    "title": "Founding",
    "body": "Li Yuan took the throne as Emperor Gaozu in 618, inheriting the administrative machinery the short-lived Sui had built and the canals they had dug. Early Tang art is still visibly continuous with Sui and Northern Dynasties work: stiffer figures, thinner glazes, a Buddhist sculptural idiom inherited rather than reinvented. What changed first was reach, not style.",
    "objects": []
  },
  {
    "year": 626,
    "era": "early",
    "title": "Taizong and the opening of the routes",
    "body": "Under Taizong the Tang broke the Eastern Turkic confederation and took control of the oasis city-states of the Tarim Basin. Chang'an became the eastern terminus of a genuinely continuous overland trade system. Foreign goods, foreign musicians, and foreign religions arrived together, and Tang artists began depicting the people who brought them.",
    "objects": []
  },
  {
    "year": 690,
    "era": "high",
    "title": "Wu Zetian",
    "body": "Wu Zetian ruled in her own name as emperor, the only woman in Chinese history to do so, and used monumental Buddhist patronage as an instrument of legitimacy. The colossal sculptures at Longmen belong to this program. Ceramic figures grow fuller, more confident, and more theatrical in the same decades.",
    "objects": []
  },
  {
    "year": 713,
    "era": "high",
    "title": "The Xuanzong court",
    "body": "The first decades of Xuanzong's long reign are the period later writers meant by the Tang golden age. Sancai glazing reaches its most ambitious scale, tomb assemblages become crowded portrait galleries of camels, grooms, horses, and foreign merchants, and the court sustains an unmatched concentration of poets and musicians. The confidence is legible in the objects: they are made to be looked at.",
    "objects": []
  },
  {
    "year": 755,
    "era": "rupture",
    "title": "The An Lushan rebellion",
    "body": "An Lushan's revolt drove the emperor from Chang'an and began eight years of war that the dynasty survived without ever recovering. Census records collapse; the Tarim garrisons are abandoned; overland trade contracts sharply. The rebellion is the hinge of this site because it is legible in the art itself. Large sancai tomb assemblages effectively stop, and the poetry written after it sounds nothing like the poetry written before.",
    "objects": []
  },
  {
    "year": 780,
    "era": "late",
    "title": "After the war",
    "body": "The late Tang state governed a smaller effective territory through negotiated accommodation with regional military governors. Patronage moved outward from the capital and downward in scale. Ceramics turn toward monochrome refinement — Yue celadon, Xing white ware — and away from polychrome display, a shift that leads directly to Song taste.",
    "objects": []
  },
  {
    "year": 907,
    "era": "late",
    "title": "End",
    "body": "The last Tang emperor was deposed in 907 and the empire fragmented into the Five Dynasties and Ten Kingdoms. The dynasty's reputation, however, was largely built afterward, by writers looking back at the Xuanzong decades across the break of 755. Much of what we call Tang art is read through that nostalgia.",
    "objects": []
  }
]
```

- [ ] **Step 2: Write `index.html` as a complete static essay**

Every timeline section from Step 1 appears as hand-written HTML. The spine does **not** fetch `timeline.json` — the JSON exists for the validator and for Task 11's cross-links, while the prose is authored directly in HTML so the page is readable with JS disabled and requires no server for the spine alone.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tang Dynasty — Culture and Art</title>
<meta name="description" content="The culture and art of the Tang dynasty, 618–907: Chang'an and the Silk Road, sancai ceramics, Dunhuang, and poetry.">
<link rel="stylesheet" href="css/tokens.css">
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/spine.css">
</head>
<body class="era-early">

<a class="skip" href="#main">Skip to content</a>

<div id="year-indicator" aria-live="polite" aria-label="Current year in view">618</div>

<header class="wrap spine-hero">
  <h1>Tang</h1>
  <p class="spine-dates">618 – 907</p>
  <p class="prose">The Tang looked outward with a confidence that the rebellion of 755
  ended and never returned. That break is visible in the objects themselves — in what
  potters stopped making, and in how poets started sounding. This is a walk down the
  dynasty, with four rooms opening off it.</p>
</header>

<nav class="wrap room-index" aria-label="Rooms">
  <h2>Four rooms</h2>
  <ul>
    <li><a href="rooms/changan.html">Chang'an and the Silk Road</a> — a schematic map of what arrived, and from where</li>
    <li><a href="rooms/ceramics.html">Ceramics</a> — sancai glaze, close up and annotated</li>
    <li><a href="rooms/dunhuang.html">Dunhuang</a> — cave murals and their registers</li>
    <li><a href="rooms/poetry.html">Poetry</a> — read in the original, with gloss</li>
  </ul>
</nav>

<main id="main" class="spine">

  <section class="era-section" data-era="early" data-year="618">
    <div class="wrap prose">
      <p class="section-year">618</p>
      <h2>Founding</h2>
      <p>Li Yuan took the throne as Emperor Gaozu in 618, inheriting the administrative
      machinery the short-lived Sui had built and the canals they had dug. Early Tang art
      is still visibly continuous with Sui and Northern Dynasties work: stiffer figures,
      thinner glazes, a Buddhist sculptural idiom inherited rather than reinvented. What
      changed first was reach, not style.</p>
    </div>
  </section>

  <section class="era-section" data-era="early" data-year="626">
    <div class="wrap prose">
      <p class="section-year">626</p>
      <h2>Taizong and the opening of the routes</h2>
      <p>Under Taizong the Tang broke the Eastern Turkic confederation and took control of
      the oasis city-states of the Tarim Basin. Chang'an became the eastern terminus of a
      genuinely continuous overland trade system. Foreign goods, foreign musicians, and
      foreign religions arrived together, and Tang artists began depicting the people who
      brought them.</p>
      <p><a href="rooms/changan.html">See the routes →</a></p>
    </div>
  </section>

  <section class="era-section" data-era="high" data-year="690">
    <div class="wrap prose">
      <p class="section-year">690</p>
      <h2>Wu Zetian</h2>
      <p>Wu Zetian ruled in her own name as emperor, the only woman in Chinese history to
      do so, and used monumental Buddhist patronage as an instrument of legitimacy. The
      colossal sculptures at Longmen belong to this program. Ceramic figures grow fuller,
      more confident, and more theatrical in the same decades.</p>
    </div>
  </section>

  <section class="era-section" data-era="high" data-year="713">
    <div class="wrap prose">
      <p class="section-year">713</p>
      <h2>The Xuanzong court</h2>
      <p>The first decades of Xuanzong's long reign are the period later writers meant by
      the Tang golden age. Sancai glazing reaches its most ambitious scale, tomb
      assemblages become crowded portrait galleries of camels, grooms, horses, and foreign
      merchants, and the court sustains an unmatched concentration of poets and musicians.
      The confidence is legible in the objects: they are made to be looked at.</p>
      <p><a href="rooms/ceramics.html">See the ceramics →</a></p>
    </div>
  </section>

  <section class="era-section rupture" data-era="rupture" data-year="755">
    <div class="wrap prose">
      <p class="section-year">755</p>
      <h2>The An Lushan rebellion</h2>
      <p>An Lushan's revolt drove the emperor from Chang'an and began eight years of war
      that the dynasty survived without ever recovering. Census records collapse; the
      Tarim garrisons are abandoned; overland trade contracts sharply.</p>
      <p>The rebellion is the hinge of this site because it is legible in the art itself.
      Large sancai tomb assemblages effectively stop, and the poetry written after it
      sounds nothing like the poetry written before.</p>
      <p><a href="rooms/poetry.html">Read what came after →</a></p>
    </div>
  </section>

  <section class="era-section" data-era="late" data-year="780">
    <div class="wrap prose">
      <p class="section-year">780</p>
      <h2>After the war</h2>
      <p>The late Tang state governed a smaller effective territory through negotiated
      accommodation with regional military governors. Patronage moved outward from the
      capital and downward in scale. Ceramics turn toward monochrome refinement — Yue
      celadon, Xing white ware — and away from polychrome display, a shift that leads
      directly to Song taste.</p>
      <p><a href="rooms/dunhuang.html">See where patronage continued →</a></p>
    </div>
  </section>

  <section class="era-section" data-era="late" data-year="907">
    <div class="wrap prose">
      <p class="section-year">907</p>
      <h2>End</h2>
      <p>The last Tang emperor was deposed in 907 and the empire fragmented into the Five
      Dynasties and Ten Kingdoms. The dynasty's reputation, however, was largely built
      afterward, by writers looking back at the Xuanzong decades across the break of 755.
      Much of what we call Tang art is read through that nostalgia.</p>
    </div>
  </section>

</main>

<footer class="wrap spine-footer">
  <p>Images are drawn from museum open-access collections. See
  <a href="assets/img/CREDITS.md">image credits</a> for per-object provenance and licensing.</p>
</footer>

<script type="module" src="js/spine.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create `css/spine.css`**

```css
.skip {
  position: absolute; left: var(--space-s); top: var(--space-s);
  background: var(--paper-raised); padding: var(--space-2xs) var(--space-s);
  transform: translateY(-200%);
}
.skip:focus { transform: none; }

.spine-hero { padding-block: var(--space-2xl) var(--space-l); }
.spine-hero h1 { font-size: clamp(4rem, 12vw, 9rem); letter-spacing: -0.02em; }
.spine-dates {
  font-family: var(--font-sans); color: var(--muted);
  letter-spacing: 0.25em; margin-block: var(--space-2xs) var(--space-m);
}

.room-index { padding-block: var(--space-l); border-block: 1px solid var(--rule); }
.room-index ul { list-style: none; padding: 0; }
.room-index li + li { margin-block-start: var(--space-xs); }
.room-index a { font-size: var(--size-step-1); }

.era-section { padding-block: var(--space-2xl); border-block-end: 1px solid var(--rule); }
.section-year {
  font-family: var(--font-sans); font-size: var(--size-step--1);
  letter-spacing: 0.2em; color: var(--accent); margin-block-end: var(--space-2xs);
}

/* The rupture is the one place both registers are visible at once. */
.era-section.rupture {
  background:
    linear-gradient(to bottom, var(--paper-raised), var(--paper));
  border-block-start: 3px solid var(--accent);
}

#year-indicator {
  position: fixed; inset-block-start: var(--space-s); inset-inline-end: var(--space-s);
  font-family: var(--font-sans); font-size: var(--size-step-1);
  color: var(--muted); background: var(--paper-raised);
  padding: var(--space-3xs) var(--space-2xs); border: 1px solid var(--rule);
  z-index: 10;
  transition: color var(--era-transition);
}

.spine-footer {
  padding-block: var(--space-l);
  font-family: var(--font-sans); font-size: var(--size-step--1); color: var(--muted);
}
```

- [ ] **Step 4: Verify the static page with JavaScript disabled**

`js/spine.js` does not exist yet, which is the point — the page must be complete without it.

1. In devtools, disable JavaScript (Chrome: Command Palette → "Disable JavaScript").
2. Reload `http://localhost:8000/`.
3. Verify: all seven sections are readable in chronological order, the four room links are present, the year indicator shows a static `618`, and the console's only error is the missing `js/spine.js` file.
4. Resize the window to 360px wide. Verify no horizontal scrollbar appears and no text is clipped.
5. Press Tab from the top. Verify the skip link appears when focused.

- [ ] **Step 5: Commit**

```bash
git add data/timeline.json index.html css/spine.css
git commit -m "Add chronological spine as a static essay

Seven sections from 618 to 907 authored directly in HTML so the spine is
fully readable without JavaScript. timeline.json carries the same structure
for the validator and later cross-linking."
```

---

## Task 3: Spine enhancement — era palette swap on scroll

**Files:**
- Create: `js/lib/observe.js`
- Create: `js/spine.js`

**Interfaces:**
- Consumes: DOM contract from Task 2 (`.era-section[data-era][data-year]`, `#year-indicator`).
- Produces:
  - `js/lib/observe.js` → `export function observeSections(elements, onEnter, options = {})` where `onEnter` is called as `onEnter(element)` and `options` accepts `{ rootMargin = "-45% 0px -45% 0px" }`. Returns `{ disconnect() }`.
  - `js/spine.js` → `export function initSpine(root = document)`. Returns `{ disconnect() }`.

- [ ] **Step 1: Create `js/lib/observe.js`**

This helper knows nothing about eras or years — it only reports which observed element is currently crossing the viewport's middle band.

```js
/**
 * Calls onEnter(element) when an element crosses the viewport's middle band.
 * rootMargin shrinks the root to a horizontal band so exactly one section
 * is "current" during normal scrolling.
 */
export function observeSections(elements, onEnter, options = {}) {
  const { rootMargin = "-45% 0px -45% 0px" } = options;

  if (typeof IntersectionObserver !== "function") {
    return { disconnect() {} };
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) onEnter(entry.target);
      }
    },
    { rootMargin, threshold: 0 }
  );

  for (const element of elements) observer.observe(element);
  return { disconnect: () => observer.disconnect() };
}
```

This module must not learn about eras or years. If a later task is tempted to add an
`era` argument here, that belongs in `spine.js` instead — `observe.js` reports *which
element* is current and nothing more.

- [ ] **Step 2: Create `js/spine.js`**

```js
import { observeSections } from "./lib/observe.js";

const ERAS = ["early", "high", "rupture", "late"];

function applyEra(body, era) {
  if (!ERAS.includes(era)) return;
  for (const name of ERAS) body.classList.toggle(`era-${name}`, name === era);
}

export function initSpine(root = document) {
  const sections = Array.from(root.querySelectorAll(".era-section[data-era]"));
  const indicator = root.getElementById
    ? root.getElementById("year-indicator")
    : root.querySelector("#year-indicator");

  if (sections.length === 0) return { disconnect() {} };

  const body = document.body;

  return observeSections(sections, (section) => {
    applyEra(body, section.dataset.era);
    if (indicator && section.dataset.year) {
      indicator.textContent = section.dataset.year;
    }
  });
}

initSpine();
```

Scroll is never hijacked here: there is no `scrollTo`, no wheel handler, and no scroll listener. The observer only reacts to native scrolling.

- [ ] **Step 3: Verify the palette swap in the browser**

1. Reload `http://localhost:8000/` with JavaScript enabled.
2. Scroll slowly from top to bottom. Verify the year indicator updates to 618, 626, 690, 713, 755, 780, 907 as each section crosses the middle of the viewport.
3. Verify the page background and link color visibly shift warm→cool as you pass the 755 section, and that the transition is gradual rather than instant.
4. Inspect `<body>`. Verify exactly one `era-*` class is present at any moment — never two, never zero.
5. Scroll back up. Verify the palette returns to the warm register.

- [ ] **Step 4: Verify reduced motion**

1. Enable the OS reduced-motion setting (Windows: Settings → Accessibility → Visual effects → Animation effects off; or in devtools, Rendering panel → Emulate CSS `prefers-reduced-motion: reduce`).
2. Reload and scroll past 755.
3. Verify the palette still changes — but instantly, with no fade. Reduced motion must not remove information, only animation.

- [ ] **Step 5: Commit**

```bash
git add js/lib/observe.js js/spine.js
git commit -m "Swap era palette from scroll position

IntersectionObserver over spine sections drives the year indicator and the
body era class. Scroll is never hijacked; the observer only reacts to native
scrolling. Reduced motion makes the swap instant rather than removing it."
```

---

## Task 4: Shared DOM and data helpers

**Files:**
- Create: `js/lib/dom.js`
- Create: `js/lib/data.js`

**Interfaces:**
- Consumes: `.notice` class from Task 1.
- Produces:
  - `js/lib/dom.js` → `export function el(tag, attrs = {}, children = [])`, `export function qs(selector, root = document)`, `export function qsa(selector, root = document)`. In `el`, an attribute key of `class` sets `className`, `text` sets `textContent`, keys starting with `on` (e.g. `onclick`) attach listeners, `dataset` takes an object, everything else becomes `setAttribute`.
  - `js/lib/data.js` → `export async function loadRecords(url, checkRecord)` returning `Promise<{ records: Array<object>, skipped: Array<string> }>`; `export class DataLoadError extends Error`; `export function renderFailure(container, message)`.

- [ ] **Step 1: Create `js/lib/dom.js`**

```js
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (value == null) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2), value);
    } else node.setAttribute(key, value);
  }

  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }

  return node;
}

export const qs = (selector, root = document) => root.querySelector(selector);
export const qsa = (selector, root = document) =>
  Array.from(root.querySelectorAll(selector));
```

- [ ] **Step 2: Create `js/lib/data.js`**

`checkRecord` returns an array of problem strings — empty means valid. A record with problems is skipped and named, never thrown, so one bad comma cannot take down a whole room. This is the light runtime check; `tools/validate.py` remains authoritative.

```js
import { el } from "./dom.js";

export class DataLoadError extends Error {
  constructor(url, cause) {
    super(`Could not load ${url}: ${cause}`);
    this.name = "DataLoadError";
    this.url = url;
  }
}

export async function loadRecords(url, checkRecord) {
  let payload;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    payload = await response.json();
  } catch (cause) {
    throw new DataLoadError(url, cause.message);
  }

  if (!Array.isArray(payload)) {
    throw new DataLoadError(url, "expected a top-level JSON array");
  }

  const records = [];
  const skipped = [];

  payload.forEach((record, index) => {
    const problems = checkRecord(record);
    if (problems.length === 0) records.push(record);
    else skipped.push(`record ${index} (${record?.id ?? "no id"}): ${problems.join("; ")}`);
  });

  return { records, skipped };
}

export function renderFailure(container, message) {
  container.replaceChildren(
    el("p", { class: "notice", role: "status", text: message })
  );
}
```

- [ ] **Step 3: Verify both helpers in the browser console**

There is no JS test runner, so verify by hand against the running server. Open `http://localhost:8000/` and in the console run:

```js
const { el } = await import("/js/lib/dom.js");
const node = el("button", { class: "x", text: "hi", dataset: { id: "a" }, "aria-label": "L" });
console.log(node.outerHTML);
// Expect: <button class="x" data-id="a" aria-label="L">hi</button>

const { loadRecords, DataLoadError } = await import("/js/lib/data.js");
await loadRecords("/data/timeline.json", (r) => (r.year ? [] : ["missing year"]))
  .then((r) => console.log(r.records.length, r.skipped));
// Expect: 7 []

await loadRecords("/data/nope.json", () => []).catch((e) =>
  console.log(e instanceof DataLoadError, e.message)
);
// Expect: true "Could not load /data/nope.json: HTTP 404"
```

Confirm all three outputs match before continuing.

- [ ] **Step 4: Commit**

```bash
git add js/lib/dom.js js/lib/data.js
git commit -m "Add shared DOM and data-loading helpers

loadRecords skips and names malformed records rather than throwing, so one
bad record cannot take down a room. Fetch and parse failures surface as a
visible inline notice via renderFailure."
```

---

## Task 5: Acquire and credit the first verified image

This task exists separately because provenance is a correctness requirement, not a chore. Task 6 cannot start without one verified image.

**Files:**
- Create: `assets/img/CREDITS.md`
- Create: `assets/img/<slug>.jpg` (filename determined by what you verify)
- Create: `tools/MANIFEST.md`

**Interfaces:**
- Consumes: nothing.
- Produces: at least one file in `assets/img/` with a verified CC0/public-domain license and a matching row in `CREDITS.md`. The slug chosen here becomes the `id` used in `data/objects.json` in Task 6.

- [ ] **Step 1: Find candidate Tang ceramics in the Met's open-access collection**

The Met Collection API needs no key. Search for Tang objects with images:

```bash
curl -s "https://collectionapi.metmuseum.org/public/collection/v1/search?q=sancai&hasImages=true&medium=Ceramics" | head -c 400
```

This returns `{"total": N, "objectIDs": [...]}`.

- [ ] **Step 2: Verify public-domain status per object before downloading**

For each candidate ID, fetch the record and read the fields that actually govern reuse:

```bash
curl -s "https://collectionapi.metmuseum.org/public/collection/v1/objects/<ID>" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["objectID"], d["isPublicDomain"], d["accessionNumber"], repr(d["title"]), d["objectDate"], d["primaryImage"][:80])'
```

**Only proceed with objects where `isPublicDomain` is `true`.** If it is `false`, discard the object regardless of how good the image is. Record the real `accessionNumber` returned here — never invent or reuse one.

- [ ] **Step 3: Download one verified image**

Pick one clear, well-lit sancai vessel or figure. Download `primaryImage` (the full-size version):

```bash
curl -sL "<primaryImage URL>" -o "assets/img/<slug>.jpg"
python3 -c "import os; print(os.path.getsize('assets/img/<slug>.jpg'), 'bytes')"
```

If the file exceeds roughly 1.5 MB, use the `primaryImageSmall` URL instead, or downscale it. Page weight matters more than pixel count the reader will never zoom to.

- [ ] **Step 4: Record provenance in `assets/img/CREDITS.md`**

Fill this table with the values the API actually returned. Do not copy the example values.

```markdown
# Image credits

Every image here comes from a museum open-access program and was verified as
public domain at the time of download. Museum servers are never hotlinked;
these are local copies.

| File | Object | Institution | Accession | License | Source |
| --- | --- | --- | --- | --- | --- |
| `<slug>.jpg` | <title as returned by the API> | The Metropolitan Museum of Art | <accessionNumber from API> | Public domain (CC0) | <objectURL from API> |
```

- [ ] **Step 5: Create `tools/MANIFEST.md` for anything not yet acquired**

```markdown
# Image download manifest

Images still needed, with the source to obtain them from. Any row here is
currently rendering as a marked placeholder on the site.

| Intended slug | Room | What is needed | Candidate source |
| --- | --- | --- | --- |
| (none yet) | | | |
```

Keep this file current. Every placeholder on the site must have a row here.

- [ ] **Step 6: Verify the image renders and is actually the right object**

1. Open `http://localhost:8000/assets/img/<slug>.jpg` directly. Verify it loads and shows the object described in `CREDITS.md`.
2. Confirm the accession number in `CREDITS.md` matches the API response exactly, character for character.
3. Confirm `isPublicDomain` was `true` for this object. If you cannot confirm it now, delete the image and add a manifest row instead.

- [ ] **Step 7: Commit**

```bash
git add assets/img/CREDITS.md assets/img/*.jpg tools/MANIFEST.md
git commit -m "Add first verified public-domain ceramic image with provenance

Object verified as public domain via the Met Collection API before download.
Accession number, institution, license, and source page recorded per file.
Museum servers are not hotlinked; this is a committed local copy."
```

---

## Task 6: Deep-zoom engine — the tracer bullet

The narrowest end-to-end slice: one room, one artifact, one hotspot, fully working and keyboard-accessible. This proves the architecture before anything is broadened.

**Files:**
- Create: `js/lib/panzoom.js`
- Create: `js/zoom.js`
- Create: `rooms/ceramics.html`
- Create: `css/room.css`
- Create: `data/objects.json`

**Interfaces:**
- Consumes: `el`/`qs` from Task 4, `loadRecords`/`renderFailure`/`DataLoadError` from Task 4, the verified image slug from Task 5.
- Produces:
  - `js/lib/panzoom.js` → `export function createPanZoom(viewport, target, options = {})` where `options` accepts `{ minScale = 1, maxScale = 4, step = 0.25 }`. Returns `{ zoomBy(delta), panBy(dx, dy), reset(), getState(), destroy() }` and `getState()` returns `{ scale, x, y }`.
  - `js/zoom.js` → `export async function initZoomRoom({ container, room, dataUrl })`, and `export function checkObject(record)` returning `string[]`.
  - `data/objects.json` → array of object records per the spec's schema, each carrying a `room` field of `"ceramics"` or `"dunhuang"`.

- [ ] **Step 1: Create `js/lib/panzoom.js`**

This module knows nothing about hotspots or artifacts — only about transforming a target element inside a viewport. Pointer Events give one code path for mouse, touch, and pen.

```js
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function createPanZoom(viewport, target, options = {}) {
  const { minScale = 1, maxScale = 4, step = 0.25 } = options;
  const state = { scale: 1, x: 0, y: 0 };
  const pointers = new Map();
  let lastPinchDistance = 0;

  function apply() {
    target.style.transform =
      `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
  }

  function constrain() {
    // At scale 1 the image is centered; beyond that, limit panning to the
    // overflow so the reader can never drag the object out of view.
    const overflowX = (viewport.clientWidth * (state.scale - 1)) / 2;
    const overflowY = (viewport.clientHeight * (state.scale - 1)) / 2;
    state.x = clamp(state.x, -overflowX, overflowX);
    state.y = clamp(state.y, -overflowY, overflowY);
  }

  function zoomBy(delta) {
    state.scale = clamp(state.scale + delta, minScale, maxScale);
    constrain();
    apply();
  }

  function panBy(dx, dy) {
    state.x += dx;
    state.y += dy;
    constrain();
    apply();
  }

  function reset() {
    state.scale = 1;
    state.x = 0;
    state.y = 0;
    apply();
  }

  function onPointerDown(event) {
    if (event.target.closest("button")) return; // let hotspots receive clicks
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add("is-grabbing");
  }

  function onPointerMove(event) {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const current = { x: event.clientX, y: event.clientY };
    pointers.set(event.pointerId, current);

    if (pointers.size === 2) {
      const [a, b] = Array.from(pointers.values());
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (lastPinchDistance) zoomBy((distance - lastPinchDistance) / 200);
      lastPinchDistance = distance;
      return;
    }

    panBy(current.x - previous.x, current.y - previous.y);
  }

  function onPointerUp(event) {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) lastPinchDistance = 0;
    if (pointers.size === 0) viewport.classList.remove("is-grabbing");
  }

  function onWheel(event) {
    if (!event.ctrlKey && !event.metaKey) return; // don't steal page scroll
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? step : -step);
  }

  viewport.addEventListener("pointerdown", onPointerDown);
  viewport.addEventListener("pointermove", onPointerMove);
  viewport.addEventListener("pointerup", onPointerUp);
  viewport.addEventListener("pointercancel", onPointerUp);
  viewport.addEventListener("wheel", onWheel, { passive: false });

  apply();

  return {
    zoomBy,
    panBy,
    reset,
    getState: () => ({ ...state }),
    destroy() {
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
      viewport.removeEventListener("pointercancel", onPointerUp);
      viewport.removeEventListener("wheel", onWheel);
    },
  };
}
```

Note the wheel handler requires Ctrl/Cmd. Hijacking plain wheel events inside a tall page is the single most hostile thing an image viewer can do.

- [ ] **Step 2: Create `data/objects.json` with exactly one record**

Use the real slug, title, accession number, and license from Task 5. Place hotspot coordinates by opening the image and estimating fractions of width and height — Step 7 verifies they land correctly.

```json
[
  {
    "id": "<slug from Task 5>",
    "room": "ceramics",
    "title": "<title from the API>",
    "date": "<objectDate from the API>",
    "museum": {
      "name": "The Metropolitan Museum of Art",
      "accession": "<accessionNumber from the API>",
      "license": "CC0"
    },
    "image": { "src": "../assets/img/<slug>.jpg", "aspect": "3/4" },
    "summary": "Two to four sentences describing what this object is and why it is worth looking at closely. Accurate, specific, and free of unsupported claims.",
    "hotspots": [
      {
        "x": 0.5,
        "y": 0.3,
        "label": "Glaze pooling",
        "body": "Lead-fluxed sancai glazes were applied thickly and ran during firing, pooling where the form turns inward and thinning over ridges. The drip lines are a record of how the piece stood in the kiln.",
        "seeAlso": []
      }
    ]
  }
]
```

The `image.src` is written relative to the room page in `rooms/`, hence the `../` prefix. Task 8's validator resolves these relative to the referencing room, so keep the convention consistent.

- [ ] **Step 3: Create `js/zoom.js`**

```js
import { el, qs } from "./lib/dom.js";
import { loadRecords, renderFailure, DataLoadError } from "./lib/data.js";

export function checkObject(record) {
  const problems = [];
  if (!record || typeof record !== "object") return ["not an object"];
  if (typeof record.id !== "string" || !record.id) problems.push("missing id");
  if (typeof record.title !== "string" || !record.title) problems.push("missing title");
  if (!record.image?.src) problems.push("missing image.src");
  if (!Array.isArray(record.hotspots)) problems.push("hotspots must be an array");
  else {
    record.hotspots.forEach((hotspot, index) => {
      const inRange = (n) => typeof n === "number" && n >= 0 && n <= 1;
      if (!inRange(hotspot.x) || !inRange(hotspot.y)) {
        problems.push(`hotspot ${index} coordinates must be within 0-1`);
      }
      if (!hotspot.label) problems.push(`hotspot ${index} missing label`);
    });
  }
  return problems;
}

function renderPanel(panel, hotspot) {
  panel.replaceChildren(
    el("h3", { text: hotspot.label }),
    el("p", { text: hotspot.body ?? "" }),
    ...(hotspot.seeAlso ?? []).map((href) =>
      el("p", {}, [el("a", { href, text: "Related object →" })])
    ),
    el("button", {
      type: "button",
      class: "panel-close",
      text: "Close",
      onclick: () => closePanel(panel),
    })
  );
  panel.hidden = false;
  qs("h3", panel).setAttribute("tabindex", "-1");
  qs("h3", panel).focus();
}

function closePanel(panel) {
  panel.hidden = true;
  panel.replaceChildren();
}

function renderObject(record, panzoomFactory) {
  const figure = el("figure", { class: "object", id: record.id });

  const viewport = el("div", { class: "zoom-viewport" });
  const stage = el("div", { class: "zoom-stage" });
  const image = el("img", {
    src: record.image.src,
    alt: `${record.title}. ${record.summary ?? ""}`,
    style: `aspect-ratio: ${record.image.aspect ?? "1/1"}`,
  });

  const panel = el("div", { class: "detail-panel", role: "region",
    "aria-label": `Detail: ${record.title}`, hidden: "" });

  stage.append(image);

  record.hotspots.forEach((hotspot, index) => {
    stage.append(
      el("button", {
        type: "button",
        class: "hotspot",
        style: `left: ${hotspot.x * 100}%; top: ${hotspot.y * 100}%`,
        "aria-label": `Detail ${index + 1}: ${hotspot.label}`,
        onclick: () => renderPanel(panel, hotspot),
      })
    );
  });

  viewport.append(stage);

  const controls = el("div", { class: "zoom-controls" });
  const pz = panzoomFactory(viewport, stage);
  controls.append(
    el("button", { type: "button", text: "Zoom in",
      onclick: () => pz.zoomBy(0.25) }),
    el("button", { type: "button", text: "Zoom out",
      onclick: () => pz.zoomBy(-0.25) }),
    el("button", { type: "button", text: "Reset view", onclick: () => pz.reset() })
  );

  viewport.setAttribute("tabindex", "0");
  viewport.setAttribute("role", "group");
  viewport.setAttribute("aria-label",
    `${record.title}, zoomable. Arrow keys pan, plus and minus zoom.`);
  viewport.addEventListener("keydown", (event) => {
    const pan = 40;
    const moves = {
      ArrowUp: () => pz.panBy(0, pan),
      ArrowDown: () => pz.panBy(0, -pan),
      ArrowLeft: () => pz.panBy(pan, 0),
      ArrowRight: () => pz.panBy(-pan, 0),
      "+": () => pz.zoomBy(0.25),
      "=": () => pz.zoomBy(0.25),
      "-": () => pz.zoomBy(-0.25),
      Escape: () => { pz.reset(); closePanel(panel); },
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    move();
  });

  // Every hotspot also appears as plain text, so the content is reachable
  // without using the visual interaction at all.
  const list = el("dl", { class: "hotspot-list" });
  for (const hotspot of record.hotspots) {
    list.append(el("dt", { text: hotspot.label }), el("dd", { text: hotspot.body ?? "" }));
  }

  figure.append(
    el("figcaption", {}, [
      el("h2", { text: record.title }),
      el("p", { class: "object-meta",
        text: `${record.date ?? ""} · ${record.museum?.name ?? ""} · ${record.museum?.accession ?? ""} · ${record.museum?.license ?? ""}` }),
      el("p", { class: "prose", text: record.summary ?? "" }),
    ]),
    controls,
    viewport,
    panel,
    el("h3", { text: "Details in text" }),
    list
  );

  return figure;
}

export async function initZoomRoom({ container, room, dataUrl }) {
  const { createPanZoom } = await import("./lib/panzoom.js");

  let result;
  try {
    result = await loadRecords(dataUrl, checkObject);
  } catch (error) {
    if (error instanceof DataLoadError) {
      renderFailure(container,
        `The objects for this room could not be loaded. ${error.message}. If you opened this file directly, serve it over HTTP instead — see the readme.`);
      return;
    }
    throw error;
  }

  const objects = result.records.filter((record) => record.room === room);

  if (objects.length === 0) {
    renderFailure(container, "No objects are available for this room yet.");
    return;
  }

  container.replaceChildren(...objects.map((record) => renderObject(record, createPanZoom)));

  if (result.skipped.length > 0) {
    container.append(
      el("p", { class: "notice", role: "status",
        text: `${result.skipped.length} record(s) were skipped as malformed: ${result.skipped.join(" | ")}` })
    );
  }
}
```

- [ ] **Step 4: Create `css/room.css`**

```css
.room-header { padding-block: var(--space-l) var(--space-m); }
.room-header .back { font-family: var(--font-sans); font-size: var(--size-step--1); }

.object { padding-block: var(--space-xl); border-block-end: 1px solid var(--rule); }
.object-meta {
  font-family: var(--font-sans); font-size: var(--size-step--1);
  color: var(--muted); margin-block: var(--space-3xs) var(--space-s);
}

.zoom-controls { display: flex; gap: var(--space-2xs); margin-block-end: var(--space-2xs); }
.zoom-controls button {
  font-family: var(--font-sans); font-size: var(--size-step--1);
  padding: var(--space-3xs) var(--space-2xs);
  background: var(--paper-raised); color: var(--ink);
  border: 1px solid var(--rule); cursor: pointer;
}

.zoom-viewport {
  position: relative; overflow: hidden;
  background: var(--paper-raised); border: 1px solid var(--rule);
  touch-action: none; cursor: grab;
  max-height: 80vh;
}
.zoom-viewport.is-grabbing { cursor: grabbing; }

.zoom-stage { position: relative; transform-origin: center center; }
.zoom-stage img { width: 100%; height: auto; }

.hotspot {
  position: absolute; translate: -50% -50%;
  width: 2rem; height: 2rem; border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 70%, transparent);
  border: 2px solid var(--paper-raised);
  cursor: pointer;
}
.hotspot:hover { background: var(--accent); }

.detail-panel {
  background: var(--paper-raised); border: 1px solid var(--rule);
  border-block-start: 3px solid var(--accent);
  padding: var(--space-s); margin-block-start: var(--space-2xs);
  max-width: var(--measure);
}
.detail-panel[hidden] { display: none; }
.panel-close {
  margin-block-start: var(--space-2xs); font-family: var(--font-sans);
  background: transparent; border: 1px solid var(--rule);
  padding: var(--space-3xs) var(--space-2xs); cursor: pointer;
}

.hotspot-list { margin-block-start: var(--space-2xs); max-width: var(--measure); }
.hotspot-list dt { font-weight: 600; margin-block-start: var(--space-2xs); }

@media (prefers-reduced-motion: reduce) {
  .zoom-stage { transition: none !important; }
}
```

- [ ] **Step 5: Create `rooms/ceramics.html` with a static fallback**

The fallback content inside `#objects` is what a reader sees if JS fails or data cannot load. It is replaced by `replaceChildren` on success.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ceramics — Tang Dynasty</title>
<link rel="stylesheet" href="../css/tokens.css">
<link rel="stylesheet" href="../css/base.css">
<link rel="stylesheet" href="../css/room.css">
</head>
<body class="era-high">

<header class="wrap room-header">
  <p class="back"><a href="../index.html">← Back to the timeline</a></p>
  <h1>Ceramics</h1>
  <p class="prose">Sancai — "three colours" — is a lead-fluxed glaze system that runs
  during firing. The colours are not painted on so much as allowed to move, and the
  finished surface is a record of what happened in the kiln. Zoom in and the technique
  becomes legible.</p>
</header>

<main class="wrap" id="objects">
  <noscript>
    <p class="notice">The interactive zoom needs JavaScript. The objects and their
    descriptions are listed below without it.</p>
  </noscript>
  <p class="notice">Loading objects…</p>
</main>

<script type="module">
  import { initZoomRoom } from "../js/zoom.js";
  initZoomRoom({
    container: document.getElementById("objects"),
    room: "ceramics",
    dataUrl: "../data/objects.json",
  });
</script>
</body>
</html>
```

- [ ] **Step 6: Verify the happy path**

Open `http://localhost:8000/rooms/ceramics.html`.

1. The object renders with its title, date, institution, accession number, and licence line.
2. "Zoom in" enlarges the image; "Reset view" returns it to fit.
3. Drag with the mouse. The image pans and cannot be dragged fully out of the frame.
4. Plain wheel scrolling scrolls the **page**, not the image. Ctrl+wheel zooms the image.
5. The hotspot appears as a circle **on the feature it describes**. If it is off target, adjust `x`/`y` in `data/objects.json` and reload until it lands.
6. Click the hotspot. The panel opens, focus moves to its heading, and "Close" hides it.

- [ ] **Step 7: Verify keyboard and screen-reader access**

1. Tab to the zoom viewport. Verify a visible focus ring.
2. Press arrow keys. The image pans. Press `+` and `-`. It zooms. Press `Esc`. The view resets and any open panel closes.
3. Continue tabbing. Verify the hotspot button is reachable and that Enter opens its panel.
4. Verify the "Details in text" description list below the image contains the same label and body as the hotspot.
5. Zoom the browser to 200%. Verify no controls are clipped or overlapping.

- [ ] **Step 8: Verify the failure paths**

1. In devtools Network panel, block `data/objects.json`, then reload. Verify a **visible** inline notice appears where the objects would be, mentioning the HTTP-serving hint. Verify the error is not console-only.
2. Temporarily set the record's `hotspots[0].x` to `1.8` and reload. Verify the object is skipped, a visible notice names it, and the page does not go blank. Restore the value.
3. Temporarily rename the image file and reload. Verify the alt text and caption render and the layout does not collapse. Restore the filename.
4. Disable JavaScript and reload. Verify the `<noscript>` notice is visible.

- [ ] **Step 9: Commit**

```bash
git add js/lib/panzoom.js js/zoom.js css/room.css rooms/ceramics.html data/objects.json
git commit -m "Add annotated deep-zoom engine with one ceramics object

Pointer Events give one path for mouse, touch, and pen. Hotspots are real
buttons with normalized 0-1 coordinates and are duplicated as a text
description list. Plain wheel scrolling is left to the page; zoom requires
Ctrl. Failed loads and malformed records render visible inline notices."
```

---

## Task 7: Data validator, developed test-first

This is the one place real red-green TDD applies, using Python's stdlib `unittest` — no `pip install`, no new toolchain.

**Files:**
- Create: `tools/test_validate.py`
- Create: `tools/validate.py`

**Interfaces:**
- Consumes: `data/*.json` and `assets/img/` from earlier tasks.
- Produces: `tools/validate.py` exposing `check_objects(records, repo_root) -> list[str]`, `check_timeline(records) -> list[str]`, `check_routes(data) -> list[str]`, `check_poems(records) -> list[str]`, and `main() -> int` returning a process exit code. All check functions return a list of human-readable problem strings; empty means valid.

- [ ] **Step 1: Write the failing tests**

```python
"""Tests for the data validator. Run: python3 -m unittest discover -s tools -v"""
import unittest
from pathlib import Path
import tempfile

from validate import check_objects, check_timeline, check_routes, check_poems


class CheckObjects(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        (self.root / "assets" / "img").mkdir(parents=True)
        (self.root / "assets" / "img" / "jar.jpg").write_bytes(b"fake")

    def valid(self):
        return {
            "id": "jar",
            "room": "ceramics",
            "title": "A jar",
            "date": "8th century",
            "museum": {"name": "M", "accession": "1.2.3", "license": "CC0"},
            "image": {"src": "../assets/img/jar.jpg", "aspect": "3/4"},
            "summary": "Words.",
            "hotspots": [{"x": 0.5, "y": 0.5, "label": "L", "body": "B", "seeAlso": []}],
        }

    def test_valid_record_has_no_problems(self):
        self.assertEqual(check_objects([self.valid()], self.root), [])

    def test_missing_image_file_is_reported(self):
        record = self.valid()
        record["image"]["src"] = "../assets/img/absent.jpg"
        problems = check_objects([record], self.root)
        self.assertTrue(any("absent.jpg" in p for p in problems))

    def test_hotspot_coordinate_above_one_is_reported(self):
        record = self.valid()
        record["hotspots"][0]["x"] = 1.4
        problems = check_objects([record], self.root)
        self.assertTrue(any("0-1" in p for p in problems))

    def test_duplicate_ids_are_reported(self):
        problems = check_objects([self.valid(), self.valid()], self.root)
        self.assertTrue(any("duplicate" in p.lower() for p in problems))

    def test_unknown_room_is_reported(self):
        record = self.valid()
        record["room"] = "kitchen"
        problems = check_objects([record], self.root)
        self.assertTrue(any("room" in p for p in problems))

    def test_missing_license_is_reported(self):
        record = self.valid()
        del record["museum"]["license"]
        problems = check_objects([record], self.root)
        self.assertTrue(any("license" in p for p in problems))


class CheckTimeline(unittest.TestCase):
    def test_valid_timeline_has_no_problems(self):
        records = [{"year": 618, "era": "early", "title": "T", "body": "B", "objects": []}]
        self.assertEqual(check_timeline(records), [])

    def test_unknown_era_is_reported(self):
        records = [{"year": 618, "era": "middle", "title": "T", "body": "B", "objects": []}]
        self.assertTrue(any("era" in p for p in check_timeline(records)))

    def test_out_of_range_year_is_reported(self):
        records = [{"year": 1200, "era": "late", "title": "T", "body": "B", "objects": []}]
        self.assertTrue(any("618" in p or "907" in p for p in check_timeline(records)))

    def test_unsorted_years_are_reported(self):
        records = [
            {"year": 780, "era": "late", "title": "A", "body": "B", "objects": []},
            {"year": 618, "era": "early", "title": "C", "body": "D", "objects": []},
        ]
        self.assertTrue(any("order" in p.lower() for p in check_timeline(records)))


class CheckRoutes(unittest.TestCase):
    def valid(self):
        return {
            "nodes": [
                {"id": "changan", "name": "Chang'an", "x": 10, "y": 20,
                 "layers": ["goods"], "body": "B", "seeAlso": []},
                {"id": "dunhuang", "name": "Dunhuang", "x": 30, "y": 40,
                 "layers": ["religions"], "body": "B", "seeAlso": []},
            ],
            "edges": [{"from": "changan", "to": "dunhuang"}],
        }

    def test_valid_routes_have_no_problems(self):
        self.assertEqual(check_routes(self.valid()), [])

    def test_edge_to_unknown_node_is_reported(self):
        data = self.valid()
        data["edges"][0]["to"] = "atlantis"
        self.assertTrue(any("atlantis" in p for p in check_routes(data)))

    def test_unknown_layer_is_reported(self):
        data = self.valid()
        data["nodes"][0]["layers"] = ["spices"]
        self.assertTrue(any("layer" in p for p in check_routes(data)))


class CheckPoems(unittest.TestCase):
    def valid(self):
        return {
            "id": "p1",
            "author": "Li Bai",
            "title": "静夜思",
            "titleGloss": "Quiet Night Thoughts",
            "context": "C",
            "lines": [{"characters": [
                {"char": "床", "pinyin": "chuáng", "gloss": "bed", "tone": "level"}
            ]}],
            "translations": {"literal": "L", "literary": "Y"},
        }

    def test_valid_poem_has_no_problems(self):
        self.assertEqual(check_poems([self.valid()]), [])

    def test_numeric_tone_is_reported(self):
        record = self.valid()
        record["lines"][0]["characters"][0]["tone"] = "2"
        problems = check_poems([record])
        self.assertTrue(any("tone" in p for p in problems))

    def test_missing_literary_translation_is_reported(self):
        record = self.valid()
        del record["translations"]["literary"]
        self.assertTrue(any("literary" in p for p in check_poems([record])))

    def test_multi_character_char_field_is_reported(self):
        record = self.valid()
        record["lines"][0]["characters"][0]["char"] = "床前"
        self.assertTrue(any("single" in p.lower() for p in check_poems([record])))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd tools && python3 -m unittest discover -s . -v`

Expected: collection error — `ModuleNotFoundError: No module named 'validate'`.

- [ ] **Step 3: Write `tools/validate.py`**

```python
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


def _load(path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def main():
    repo_root = Path(__file__).resolve().parent.parent
    data_dir = repo_root / "data"
    problems = []

    checks = [
        ("objects.json", lambda d: check_objects(d, repo_root)),
        ("timeline.json", check_timeline),
        ("routes.json", check_routes),
        ("poems.json", check_poems),
    ]

    for filename, check in checks:
        path = data_dir / filename
        if not path.is_file():
            print(f"skipped {filename} (not created yet)")
            continue
        try:
            problems.extend(check(_load(path)))
        except json.JSONDecodeError as error:
            problems.append(f"{filename}: invalid JSON — {error}")

    if problems:
        print(f"{len(problems)} problem(s) found:\n")
        for problem in problems:
            print(f"  - {problem}")
        return 1

    print("All data files valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd tools && python3 -m unittest discover -s . -v`

Expected: all tests PASS. If any fail, fix `validate.py` — not the test — unless the test itself encodes a wrong expectation.

- [ ] **Step 5: Run the validator against real data**

Run from the repository root: `python3 tools/validate.py`

Expected: `routes.json` and `poems.json` report as skipped (not yet created), and `objects.json`/`timeline.json` report valid. If the real hotspot coordinates or image path fail, fix the data.

- [ ] **Step 6: Verify the validator actually catches a real regression**

1. Edit `data/objects.json` and change the image `src` to a filename that does not exist.
2. Run `python3 tools/validate.py`. Verify it exits non-zero and names the missing file.
3. Check the exit code: `python3 tools/validate.py; echo "exit=$?"` → `exit=1`.
4. Restore the correct filename and confirm it passes again.

- [ ] **Step 7: Commit**

```bash
git add tools/validate.py tools/test_validate.py
git commit -m "Add data validator with unit tests

Checks record shape, image existence, hotspot coordinate range, cross-field
constraints, and rejects numeric Mandarin tone values in poem data. Stdlib
unittest only, so the project still needs no package manager."
```

---

## Task 8: Broaden the ceramics room

**Files:**
- Modify: `data/objects.json`
- Modify: `assets/img/CREDITS.md`
- Modify: `tools/MANIFEST.md`
- Modify: `rooms/ceramics.html` (prose only)

**Interfaces:**
- Consumes: everything from Tasks 5–7. No new interfaces.
- Produces: five to seven verified ceramics records in `data/objects.json`.

- [ ] **Step 1: Acquire four to six more verified images**

Repeat Task 5's procedure for each. Aim for a range that supports the site's argument: a sancai ewer or jar, a sancai tomb figure (horse or camel), a Sogdian or Central Asian figure, a late-Tang monochrome (Yue celadon or Xing white ware), and one unglazed or painted piece for contrast.

For each: confirm `isPublicDomain` is `true`, record the real accession number, download, and add a `CREDITS.md` row. Anything you cannot verify goes in `tools/MANIFEST.md` instead — not into `objects.json`.

- [ ] **Step 2: Write a record per object with two to four hotspots each**

Follow the schema from Task 6 Step 2 exactly. Hotspots should teach something specific and checkable — glaze pooling at a form's turn, a wheel-throwing ridge, the join line of a mould-made figure, cobalt used sparingly because it was imported and expensive, foreign facial modelling on a groom. Avoid unsupported aesthetic assertions.

The late-Tang monochrome piece should carry a hotspot that connects explicitly to the 755 rupture — the shift from polychrome display toward monochrome refinement is the argument the whole site is making.

- [ ] **Step 3: Validate**

Run: `python3 tools/validate.py`

Expected: `objects.json` valid. Fix any reported problem before continuing.

- [ ] **Step 4: Verify every hotspot lands on its feature**

This cannot be automated — the validator only checks that coordinates are within 0–1, not that they point at the right thing.

Open `http://localhost:8000/rooms/ceramics.html` and for **each** object: zoom in on each hotspot and confirm the circle sits on the feature its label names. Adjust coordinates and reload until every one is correct.

- [ ] **Step 5: Run the room QA checklist**

1. Keyboard-only: Tab through the entire page. Every viewport and hotspot is reachable, focus is always visible, and focus is never trapped in a detail panel.
2. Reduced motion: with the OS setting on, no animation occurs.
3. Narrow viewport: at 360px wide, no horizontal scrollbar, no clipped controls, images fit.
4. JS disabled: the `<noscript>` notice shows.
5. Broken data: corrupt `objects.json` (delete a closing brace), reload, confirm a visible inline notice rather than a blank page, then restore.

- [ ] **Step 6: Commit**

```bash
git add data/objects.json assets/img/ tools/MANIFEST.md rooms/ceramics.html
git commit -m "Broaden ceramics room to a full object set

Five to seven verified public-domain objects spanning high-Tang polychrome
display and late-Tang monochrome refinement, with hotspots on checkable
technical features. Every accession number verified against the source API."
```

---

## Task 9: Chang'an and the Silk Road map

**Files:**
- Create: `data/routes.json`
- Create: `js/map.js`
- Create: `rooms/changan.html`
- Modify: `css/room.css` (append map styles)

**Interfaces:**
- Consumes: `el`/`qs` from Task 4, `loadRecords`/`renderFailure`/`DataLoadError` from Task 4.
- Produces: `js/map.js` → `export async function initMapRoom({ container, dataUrl })` and `export function checkRoutes(data)` returning `string[]`. Note `routes.json` is a single **object** with `nodes` and `edges` keys, not a top-level array, so this module does **not** use `loadRecords` (which requires an array) — it fetches directly and reports failures with `renderFailure`.

- [ ] **Step 1: Create `data/routes.json`**

Coordinates are positions in the SVG's own 1000×520 coordinate space, not real latitude and longitude. This is a schematic and the page says so.

```json
{
  "nodes": [
    { "id": "changan", "name": "Chang'an", "x": 860, "y": 300,
      "layers": ["goods", "religions", "quarters"],
      "body": "The eastern terminus and the largest city in the world at its height, laid out as a walled grid with a foreign quarter near the West Market. Everything on this map converges here.",
      "seeAlso": [] },
    { "id": "dunhuang", "name": "Dunhuang", "x": 600, "y": 250,
      "layers": ["goods", "religions"],
      "body": "The junction where the routes around the Taklamakan rejoined, and a Buddhist cave complex sustained by the traffic passing through it.",
      "seeAlso": ["dunhuang.html"] },
    { "id": "kucha", "name": "Kucha", "x": 430, "y": 210,
      "layers": ["goods", "religions"],
      "body": "An oasis kingdom whose musicians and instruments were absorbed into Tang court music so completely that the court's repertoire was substantially Central Asian.",
      "seeAlso": [] },
    { "id": "samarkand", "name": "Samarkand", "x": 250, "y": 230,
      "layers": ["goods", "religions", "quarters"],
      "body": "A Sogdian city whose merchants ran much of the overland trade. Sogdians appear repeatedly in Tang tomb ceramics as grooms, camel drivers, and traders.",
      "seeAlso": [] },
    { "id": "khotan", "name": "Khotan", "x": 380, "y": 330,
      "layers": ["goods"],
      "body": "The principal source of nephrite jade reaching China, and a Buddhist kingdom on the southern rim of the Taklamakan.",
      "seeAlso": [] },
    { "id": "ctesiphon", "name": "Ctesiphon / Baghdad", "x": 110, "y": 300,
      "layers": ["goods", "religions"],
      "body": "Sasanian then Abbasid Mesopotamia. Sasanian metalwork forms travelled east and were reinterpreted in Tang silver and ceramic; cobalt for blue glaze came from this direction.",
      "seeAlso": [] },
    { "id": "guangzhou", "name": "Guangzhou", "x": 830, "y": 460,
      "layers": ["goods", "quarters"],
      "body": "The southern maritime port, with a resident community of Arab and Persian merchants. Sea trade grew in importance as the overland routes contracted after 755.",
      "seeAlso": [] }
  ],
  "edges": [
    { "from": "ctesiphon", "to": "samarkand" },
    { "from": "samarkand", "to": "kucha" },
    { "from": "samarkand", "to": "khotan" },
    { "from": "kucha", "to": "dunhuang" },
    { "from": "khotan", "to": "dunhuang" },
    { "from": "dunhuang", "to": "changan" },
    { "from": "ctesiphon", "to": "guangzhou" },
    { "from": "guangzhou", "to": "changan" }
  ]
}
```

Verify every `seeAlso` value resolves — `dunhuang.html` is created in Task 10, so Task 11's cross-link pass re-checks it.

- [ ] **Step 2: Create `js/map.js`**

```js
import { el, qs } from "./lib/dom.js";
import { renderFailure, DataLoadError } from "./lib/data.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const LAYERS = [
  { id: "goods", label: "Traded goods" },
  { id: "religions", label: "Religions" },
  { id: "quarters", label: "Foreign quarters" },
];

export function checkRoutes(data) {
  const problems = [];
  if (!Array.isArray(data?.nodes)) return ["nodes must be an array"];
  const ids = new Set(data.nodes.map((node) => node.id));
  data.nodes.forEach((node, index) => {
    if (!node.id) problems.push(`node ${index}: missing id`);
    if (typeof node.x !== "number" || typeof node.y !== "number") {
      problems.push(`node ${node.id ?? index}: x and y must be numbers`);
    }
  });
  (data.edges ?? []).forEach((edge, index) => {
    for (const end of ["from", "to"]) {
      if (!ids.has(edge[end])) {
        problems.push(`edge ${index}: ${end} references unknown node ${edge[end]}`);
      }
    }
  });
  return problems;
}

function svg(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function buildMap(data, onSelect) {
  const byId = new Map(data.nodes.map((node) => [node.id, node]));
  const root = svg("svg", {
    viewBox: "0 0 1000 520",
    class: "route-map",
    role: "img",
    "aria-label": "Schematic map of trade routes converging on Chang'an",
  });

  const edgeGroup = svg("g", { class: "edges" });
  for (const edge of data.edges ?? []) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) continue;
    edgeGroup.append(
      svg("line", { x1: from.x, y1: from.y, x2: to.x, y2: to.y, class: "edge" })
    );
  }
  root.append(edgeGroup);

  const nodeButtons = [];
  for (const node of data.nodes) {
    const group = svg("g", {
      class: "node",
      "data-layers": node.layers.join(" "),
      transform: `translate(${node.x} ${node.y})`,
    });
    group.append(svg("circle", { r: 9, class: "node-dot" }));
    const label = svg("text", { x: 14, y: 5, class: "node-label" });
    label.textContent = node.name;
    group.append(label);

    // A focusable SVG element needs an explicit role and tabindex to behave
    // like a button for keyboard and assistive technology.
    group.setAttribute("tabindex", "0");
    group.setAttribute("role", "button");
    group.setAttribute("aria-label", `${node.name}. Show what arrived from here.`);
    group.addEventListener("click", () => onSelect(node));
    group.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onSelect(node);
    });

    root.append(group);
    nodeButtons.push(group);
  }

  return { root, nodeButtons };
}

function buildLayerToggles(root, onToggle) {
  const fieldset = el("fieldset", { class: "layer-toggles" }, [
    el("legend", { text: "Layers" }),
  ]);

  for (const layer of LAYERS) {
    const input = el("input", {
      type: "checkbox",
      id: `layer-${layer.id}`,
      checked: "",
      onchange: () => onToggle(),
    });
    fieldset.append(
      el("label", { for: `layer-${layer.id}`, class: "layer-toggle" }, [
        input,
        document.createTextNode(` ${layer.label}`),
      ])
    );
  }

  return fieldset;
}

function activeLayers(container) {
  return LAYERS.filter((layer) => qs(`#layer-${layer.id}`, container)?.checked)
    .map((layer) => layer.id);
}

export async function initMapRoom({ container, dataUrl }) {
  let data;
  try {
    const response = await fetch(dataUrl);
    if (!response.ok) throw new DataLoadError(dataUrl, `HTTP ${response.status}`);
    data = await response.json();
  } catch (error) {
    renderFailure(container,
      `The route data could not be loaded. ${error.message}. If you opened this file directly, serve it over HTTP instead — see the readme.`);
    return;
  }

  const problems = checkRoutes(data);
  if (problems.length > 0) {
    renderFailure(container, `The route data is malformed: ${problems.join("; ")}`);
    return;
  }

  const detail = el("div", { class: "detail-panel node-detail", role: "region",
    "aria-live": "polite", "aria-label": "Selected place" });

  function showNode(node) {
    detail.replaceChildren(
      el("h3", { text: node.name }),
      el("p", { text: node.body }),
      ...(node.seeAlso ?? []).map((href) =>
        el("p", {}, [el("a", { href, text: "See the objects →" })])
      )
    );
  }

  const { root, nodeButtons } = buildMap(data, showNode);

  function applyLayers() {
    const active = activeLayers(container);
    for (const group of nodeButtons) {
      const layers = (group.dataset.layers ?? "").split(" ");
      const visible = layers.some((layer) => active.includes(layer));
      group.classList.toggle("is-dimmed", !visible);
      // Dimmed nodes stay in the DOM but leave the tab order, so keyboard
      // users are not sent to places the current layers have hidden.
      group.setAttribute("tabindex", visible ? "0" : "-1");
    }
  }

  const toggles = buildLayerToggles(container, applyLayers);

  container.replaceChildren(
    toggles,
    root,
    el("p", { class: "map-note",
      text: "This is a schematic, not a cartographically accurate map. Positions are relative, not surveyed." }),
    detail,
    el("h2", { text: "Places in text" }),
    el("dl", { class: "hotspot-list" },
      data.nodes.flatMap((node) => [
        el("dt", { text: node.name }),
        el("dd", { text: node.body }),
      ])
    )
  );

  showNode(data.nodes.find((node) => node.id === "changan") ?? data.nodes[0]);
  applyLayers();
}
```

- [ ] **Step 3: Append map styles to `css/room.css`**

```css
.layer-toggles {
  border: 1px solid var(--rule); padding: var(--space-2xs) var(--space-s);
  font-family: var(--font-sans); font-size: var(--size-step--1);
  display: flex; flex-wrap: wrap; gap: var(--space-s); align-items: center;
  margin-block-end: var(--space-s);
}
.layer-toggles legend { padding-inline: var(--space-2xs); }
.layer-toggle { display: inline-flex; align-items: center; gap: var(--space-3xs); }

.route-map {
  width: 100%; height: auto; background: var(--paper-raised);
  border: 1px solid var(--rule);
}
.edge { stroke: var(--rule); stroke-width: 2; }
.node-dot { fill: var(--accent); }
.node-label {
  fill: var(--ink); font-family: var(--font-sans); font-size: 18px;
}
.node { cursor: pointer; }
.node:focus-visible { outline: 3px solid var(--accent-3); outline-offset: 2px; }
.node.is-dimmed { opacity: 0.25; pointer-events: none; }

.map-note {
  font-family: var(--font-sans); font-size: var(--size-step--1);
  color: var(--muted); margin-block: var(--space-2xs) var(--space-s);
}
.node-detail { margin-block-end: var(--space-l); }
```

- [ ] **Step 4: Create `rooms/changan.html`**

The static fallback lists every place in prose, so the room is informative without JS.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Chang'an and the Silk Road — Tang Dynasty</title>
<link rel="stylesheet" href="../css/tokens.css">
<link rel="stylesheet" href="../css/base.css">
<link rel="stylesheet" href="../css/room.css">
</head>
<body class="era-high">

<header class="wrap room-header">
  <p class="back"><a href="../index.html">← Back to the timeline</a></p>
  <h1>Chang'an and the Silk Road</h1>
  <p class="prose">Chang'an was the eastern end of a trade system that ran to Mesopotamia,
  and the objects buried in its tombs record who came down it. Toggle the layers to
  separate goods from religions from the resident foreign communities, then select a place
  to see what arrived from there.</p>
</header>

<main class="wrap" id="map-room">
  <noscript>
    <p class="notice">The interactive map needs JavaScript. Every place and what arrived
    from it is described in the list below.</p>
    <dl class="hotspot-list">
      <dt>Chang'an</dt>
      <dd>The eastern terminus and the largest city in the world at its height, laid out
      as a walled grid with a foreign quarter near the West Market.</dd>
      <dt>Dunhuang</dt>
      <dd>The junction where the routes around the Taklamakan rejoined, and a Buddhist
      cave complex sustained by the traffic passing through it.</dd>
      <dt>Kucha</dt>
      <dd>An oasis kingdom whose musicians and instruments were absorbed into Tang court
      music.</dd>
      <dt>Samarkand</dt>
      <dd>A Sogdian city whose merchants ran much of the overland trade, and who appear
      repeatedly in Tang tomb ceramics.</dd>
      <dt>Khotan</dt>
      <dd>The principal source of nephrite jade reaching China.</dd>
      <dt>Ctesiphon and Baghdad</dt>
      <dd>Sasanian then Abbasid Mesopotamia. Metalwork forms travelled east; cobalt for
      blue glaze came from this direction.</dd>
      <dt>Guangzhou</dt>
      <dd>The southern maritime port, with resident Arab and Persian merchants. Sea trade
      grew as the overland routes contracted after 755.</dd>
    </dl>
  </noscript>
  <p class="notice">Loading the map…</p>
</main>

<script type="module">
  import { initMapRoom } from "../js/map.js";
  initMapRoom({
    container: document.getElementById("map-room"),
    dataUrl: "../data/routes.json",
  });
</script>
</body>
</html>
```

- [ ] **Step 5: Validate the data**

Run: `python3 tools/validate.py`

Expected: `routes.json` now validates. Fix any reported problem.

- [ ] **Step 6: Verify the map in the browser**

Open `http://localhost:8000/rooms/changan.html`.

1. All seven places render with connecting lines, and Chang'an's detail shows by default.
2. Click each place. Its detail panel updates with the right name and text.
3. Uncheck "Religions". Verify places belonging only to that layer dim, and that places in a still-active layer stay bright.
4. Uncheck all three layers. Verify every place dims and nothing errors in the console.
5. Re-check all layers. Everything returns.

- [ ] **Step 7: Verify keyboard access and the tab-order behavior**

1. Tab through the page. Each layer checkbox is reachable and toggleable with Space.
2. Continue tabbing. Each visible place receives a visible focus ring; Enter and Space both open its detail.
3. Uncheck a layer, then Tab through the places again. **Verify dimmed places are skipped entirely** — this is the `tabindex="-1"` behavior and it is the whole reason that line exists.
4. Verify the "Places in text" list at the bottom contains all seven places regardless of layer state.

- [ ] **Step 8: Verify failure and no-JS paths**

1. Block `data/routes.json` in devtools and reload. Verify a visible inline notice with the HTTP hint.
2. Disable JavaScript and reload. Verify the `<noscript>` list of all seven places is visible and readable.
3. At 360px wide, verify the SVG scales down without a horizontal scrollbar and the layer toggles wrap rather than overflow.

- [ ] **Step 9: Commit**

```bash
git add data/routes.json js/map.js rooms/changan.html css/room.css
git commit -m "Add Chang'an room with layered Silk Road map

Inline SVG with hand-authored schematic geometry — no tile provider, no API
key, no third party able to break the page. Layer toggles are real
checkboxes; dimmed places leave the tab order so keyboard users are not sent
to hidden content. Labelled a schematic on the page."
```

---

## Task 10: Dunhuang room — reuse the zoom engine unchanged

**Files:**
- Create: `rooms/dunhuang.html`
- Modify: `data/objects.json`
- Modify: `assets/img/CREDITS.md`
- Modify: `tools/MANIFEST.md`

**Interfaces:**
- Consumes: `initZoomRoom` from Task 6, unchanged.
- Produces: three to five records in `data/objects.json` with `"room": "dunhuang"`.

**If `js/zoom.js` needs modification to work here, that is a signal the engine's interface is wrong.** Fix the interface rather than forking the module, and note what changed in the commit message.

- [ ] **Step 1: Acquire verified Buddhist-art images**

Dunhuang cave murals are largely *in situ* and photographs of them are often **not** freely licensed even when the paintings themselves are ancient — a photograph can carry its own copyright. Be stricter here than in Task 5.

Prefer: Dunhuang material in the Smithsonian open-access collection, Cleveland Museum of Art open access (which marks CC0 clearly), or Met open-access Tang Buddhist sculpture and painting. Verify each one's license field explicitly.

Any mural you cannot license goes in `tools/MANIFEST.md` as a placeholder row. **Do not ship an unlicensed photograph because the underlying artwork is old.** That reasoning is wrong and this is the room where it is most tempting.

- [ ] **Step 2: Append Dunhuang records to `data/objects.json`**

Same schema as Task 6 Step 2, with `"room": "dunhuang"`. Hotspots should teach iconographic reading: the register structure of a wall, a donor portrait's scale relative to the deity, a mandorla, the difference between a bodhisattva's and a Buddha's attributes, pigment that has darkened or altered since painting.

- [ ] **Step 3: Create `rooms/dunhuang.html`**

Identical in structure to `rooms/ceramics.html` from Task 6 Step 5, with three changes: the `<title>` becomes "Dunhuang — Tang Dynasty", the header prose is Dunhuang-specific, and `room:` in the init call becomes `"dunhuang"`.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dunhuang — Tang Dynasty</title>
<link rel="stylesheet" href="../css/tokens.css">
<link rel="stylesheet" href="../css/base.css">
<link rel="stylesheet" href="../css/room.css">
</head>
<body class="era-high">

<header class="wrap room-header">
  <p class="back"><a href="../index.html">← Back to the timeline</a></p>
  <h1>Dunhuang and Buddhist art</h1>
  <p class="prose">Buddhist painting is organised, not arbitrary. Figures sit in registers,
  scale encodes status, and attributes identify who you are looking at. Once the system is
  visible the images become readable rather than merely decorative.</p>
</header>

<main class="wrap" id="objects">
  <noscript>
    <p class="notice">The interactive zoom needs JavaScript. The works and their
    descriptions are listed below without it.</p>
  </noscript>
  <p class="notice">Loading objects…</p>
</main>

<script type="module">
  import { initZoomRoom } from "../js/zoom.js";
  initZoomRoom({
    container: document.getElementById("objects"),
    room: "dunhuang",
    dataUrl: "../data/objects.json",
  });
</script>
</body>
</html>
```

- [ ] **Step 4: Validate**

Run: `python3 tools/validate.py`

Expected: valid. The `room` field check from Task 7 accepts `dunhuang`.

- [ ] **Step 5: Verify the room and confirm the engine was reused**

1. Open `http://localhost:8000/rooms/dunhuang.html`. All Dunhuang objects render; no ceramics objects appear.
2. Open `http://localhost:8000/rooms/ceramics.html`. All ceramics objects render; no Dunhuang objects appear.
3. Run `git status --short`. **Verify `js/zoom.js` is unmodified.** If it is modified, state in the commit message what interface flaw forced the change.
4. Run the five-point room QA checklist from Task 8 Step 5 against this room.

- [ ] **Step 6: Commit**

```bash
git add rooms/dunhuang.html data/objects.json assets/img/ tools/MANIFEST.md
git commit -m "Add Dunhuang room reusing the zoom engine

Room filtering by the record's room field meant no engine changes were
needed. Every photograph's license verified independently of the age of the
underlying artwork."
```

---

## Task 11: Poetry room

**Files:**
- Create: `data/poems.json`
- Create: `js/poem.js`
- Create: `rooms/poetry.html`
- Modify: `css/room.css` (append poem styles)

**Interfaces:**
- Consumes: `el`/`qs` from Task 4, `loadRecords`/`renderFailure`/`DataLoadError` from Task 4.
- Produces: `js/poem.js` → `export async function initPoemRoom({ container, dataUrl })` and `export function checkPoem(record)` returning `string[]`.

- [ ] **Step 1: Create `data/poems.json` with three poems**

Use three short, securely attributed poems — one each from Li Bai, Du Fu, and Wang Wei — with at least one written after 755 so the rupture is audible.

**Accuracy requirements, per the approved editorial scope:**
- `tone` is `level` or `oblique` only. These are reconstructed *píng/zè* categories for Middle Chinese, **not** modern Mandarin tone numbers. A character's modern tone does not reliably determine its Middle Chinese category — the departing and entering tones both count as oblique, and many characters with modern first or second tone were historically oblique. Where you are unsure of a character's category, say so in the poem's `context` rather than guessing.
- `pinyin` is modern Mandarin, provided as a reading aid only. Do not present it as Tang pronunciation.
- `gloss` is the character's sense *in this line*, not a dictionary dump.

```json
[
  {
    "id": "jingyesi",
    "author": "Li Bai",
    "title": "静夜思",
    "titleGloss": "Quiet Night Thoughts",
    "context": "The best-known short poem in the language, and a good place to see how much a Tang quatrain does with twenty characters. Tone categories below are reconstructed ping/ze classes for Middle Chinese; where a character's class is contested it is noted here rather than asserted in the data.",
    "lines": [
      {
        "characters": [
          { "char": "床", "pinyin": "chuáng", "gloss": "bed", "tone": "level" },
          { "char": "前", "pinyin": "qián", "gloss": "before, in front of", "tone": "level" },
          { "char": "明", "pinyin": "míng", "gloss": "bright", "tone": "level" },
          { "char": "月", "pinyin": "yuè", "gloss": "moon", "tone": "oblique" },
          { "char": "光", "pinyin": "guāng", "gloss": "light", "tone": "level" }
        ]
      }
    ],
    "translations": {
      "literal": "Before the bed, bright moonlight.",
      "literary": "Moonlight pools at the foot of the bed."
    }
  }
]
```

Complete all four lines of this poem and add the two others in the same shape. The single line above shows the structure; do not ship a one-line poem.

- [ ] **Step 2: Create `js/poem.js`**

```js
import { el, qs } from "./lib/dom.js";
import { loadRecords, renderFailure, DataLoadError } from "./lib/data.js";

const TONES = new Set(["level", "oblique"]);
const TONE_MARK = { level: "—", oblique: "╲" };

export function checkPoem(record) {
  const problems = [];
  if (!record?.id) problems.push("missing id");
  if (!record?.title) problems.push("missing title");
  if (!Array.isArray(record?.lines) || record.lines.length === 0) {
    problems.push("lines must be a non-empty array");
    return problems;
  }
  record.lines.forEach((line, index) => {
    if (!Array.isArray(line.characters) || line.characters.length === 0) {
      problems.push(`line ${index}: characters must be a non-empty array`);
      return;
    }
    for (const char of line.characters) {
      if (!char.char) problems.push(`line ${index}: character missing char`);
      if (!TONES.has(char.tone)) {
        problems.push(`line ${index}: tone must be level or oblique, got ${char.tone}`);
      }
    }
  });
  if (!record.translations?.literal) problems.push("missing literal translation");
  if (!record.translations?.literary) problems.push("missing literary translation");
  return problems;
}

function renderCharacter(char, gloss) {
  const button = el("button", {
    type: "button",
    class: "poem-char",
    lang: "zh-Hans",
    text: char.char,
    dataset: { tone: char.tone },
    "aria-label": `${char.char}, ${char.pinyin}, meaning ${char.gloss}, ${char.tone} tone`,
  });

  // Gloss reveals on focus as well as hover; hover alone would exclude
  // keyboard and touch users entirely.
  const show = () => {
    gloss.replaceChildren(
      el("span", { class: "gloss-char", lang: "zh-Hans", text: char.char }),
      el("span", { class: "gloss-pinyin", text: char.pinyin }),
      el("span", { class: "gloss-sense", text: char.gloss }),
      el("span", { class: "gloss-tone", text: `${char.tone} tone (reconstructed)` })
    );
  };

  button.addEventListener("mouseenter", show);
  button.addEventListener("focus", show);
  return button;
}

function renderPoem(record) {
  const article = el("article", { class: "poem", id: record.id });
  const gloss = el("div", { class: "poem-gloss", role: "status", "aria-live": "polite" });

  const lines = el("div", { class: "poem-lines" });
  for (const line of record.lines) {
    const row = el("div", { class: "poem-line" });
    const marks = el("div", { class: "tone-marks", "aria-hidden": "true" });
    for (const char of line.characters) {
      row.append(renderCharacter(char, gloss));
      marks.append(el("span", { class: "tone-mark", text: TONE_MARK[char.tone] }));
    }
    lines.append(row, marks);
  }

  const translation = el("p", { class: "poem-translation",
    text: record.translations.literary });

  const toneToggle = el("button", {
    type: "button", class: "poem-toggle", "aria-pressed": "false",
    text: "Show tone pattern",
    onclick: (event) => {
      const on = article.classList.toggle("show-tones");
      event.currentTarget.setAttribute("aria-pressed", String(on));
      event.currentTarget.textContent = on ? "Hide tone pattern" : "Show tone pattern";
    },
  });

  const translationToggle = el("button", {
    type: "button", class: "poem-toggle", "aria-pressed": "false",
    text: "Show literal translation",
    onclick: (event) => {
      const literal = translation.textContent === record.translations.literary;
      translation.textContent = literal
        ? record.translations.literal
        : record.translations.literary;
      event.currentTarget.setAttribute("aria-pressed", String(literal));
      event.currentTarget.textContent = literal
        ? "Show literary translation"
        : "Show literal translation";
    },
  });

  article.append(
    el("h2", { lang: "zh-Hans", text: record.title }),
    el("p", { class: "poem-meta", text: `${record.titleGloss} · ${record.author}` }),
    el("p", { class: "prose", text: record.context }),
    el("div", { class: "poem-toggles" }, [toneToggle, translationToggle]),
    lines,
    gloss,
    translation
  );

  return article;
}

export async function initPoemRoom({ container, dataUrl }) {
  let result;
  try {
    result = await loadRecords(dataUrl, checkPoem);
  } catch (error) {
    if (error instanceof DataLoadError) {
      renderFailure(container,
        `The poems could not be loaded. ${error.message}. If you opened this file directly, serve it over HTTP instead — see the readme.`);
      return;
    }
    throw error;
  }

  if (result.records.length === 0) {
    renderFailure(container, "No poems are available yet.");
    return;
  }

  container.replaceChildren(...result.records.map(renderPoem));

  if (result.skipped.length > 0) {
    container.append(el("p", { class: "notice", role: "status",
      text: `${result.skipped.length} poem(s) skipped as malformed: ${result.skipped.join(" | ")}` }));
  }
}
```

- [ ] **Step 3: Append poem styles to `css/room.css`**

```css
.poem { padding-block: var(--space-xl); border-block-end: 1px solid var(--rule); }
.poem h2 { font-size: var(--size-step-2); }
.poem-meta {
  font-family: var(--font-sans); font-size: var(--size-step--1);
  color: var(--muted); margin-block: var(--space-3xs) var(--space-s);
}

.poem-toggles { display: flex; gap: var(--space-2xs); margin-block: var(--space-s); }
.poem-toggle {
  font-family: var(--font-sans); font-size: var(--size-step--1);
  padding: var(--space-3xs) var(--space-2xs);
  background: var(--paper-raised); border: 1px solid var(--rule); cursor: pointer;
}
.poem-toggle[aria-pressed="true"] { background: var(--accent); color: var(--paper); }

.poem-line { display: flex; gap: var(--space-2xs); }
.poem-char {
  font-family: var(--font-serif); font-size: var(--size-step-2);
  background: transparent; border: 1px solid transparent; cursor: help;
  padding: var(--space-3xs); line-height: 1.2;
}
.poem-char:hover, .poem-char:focus-visible { border-color: var(--accent); }

/* Tone marks are hidden until the toggle is pressed, and never occupy space
   when hidden, so the poem's own spacing is unaffected. */
.tone-marks { display: none; gap: var(--space-2xs); }
.poem.show-tones .tone-marks { display: flex; }
.tone-mark {
  width: calc(var(--size-step-2) + var(--space-2xs));
  text-align: center; color: var(--accent-3); font-family: var(--font-sans);
}

.poem-gloss {
  min-height: 4.5rem; margin-block: var(--space-s);
  padding: var(--space-2xs) var(--space-s);
  background: var(--paper-raised); border-inline-start: 3px solid var(--accent-3);
  display: flex; flex-wrap: wrap; gap: var(--space-s); align-items: baseline;
  font-family: var(--font-sans); font-size: var(--size-step--1);
}
.gloss-char { font-family: var(--font-serif); font-size: var(--size-step-1); }
.gloss-sense { font-size: var(--size-step-0); }
.gloss-tone { color: var(--muted); }

.poem-translation { max-width: var(--measure); font-style: italic; }
```

- [ ] **Step 4: Create `rooms/poetry.html`**

The static fallback contains the **full text** of every poem and both translations, so the room is genuinely useful with JS off.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Poetry — Tang Dynasty</title>
<link rel="stylesheet" href="../css/tokens.css">
<link rel="stylesheet" href="../css/base.css">
<link rel="stylesheet" href="../css/room.css">
</head>
<body class="era-late">

<header class="wrap room-header">
  <p class="back"><a href="../index.html">← Back to the timeline</a></p>
  <h1>Poetry</h1>
  <p class="prose">Three poems, read closely. Hover or focus a character for its sense in
  that line, and toggle the tone pattern to see the alternation the form is built on.</p>
  <p class="notice">On tones: the level and oblique marks shown here are
  <strong>reconstructed</strong> <em>píng</em>/<em>zè</em> categories for Middle Chinese,
  the phonology of the Tang period. They are not modern Mandarin tones, and a character's
  modern tone does not reliably indicate its historical category. This site makes no claim
  to reproduce eighth-century pronunciation and includes no audio, because Middle Chinese
  phonology is reconstructed from rhyme dictionaries and comparative evidence rather than
  heard.</p>
</header>

<main class="wrap" id="poems">
  <noscript>
    <p class="notice">The per-character gloss needs JavaScript. The full text of each poem
    and both translations are below.</p>
    <!-- Author the full text of all three poems here, each with its title,
         author, original characters, literal translation, and literary
         translation. This is the no-JS reading experience and must be
         complete, not a stub. -->
  </noscript>
  <p class="notice">Loading poems…</p>
</main>

<script type="module">
  import { initPoemRoom } from "../js/poem.js";
  initPoemRoom({
    container: document.getElementById("poems"),
    dataUrl: "../data/poems.json",
  });
</script>
</body>
</html>
```

- [ ] **Step 5: Validate**

Run: `python3 tools/validate.py`

Expected: `poems.json` validates. Confirm the tone check works by temporarily setting a `tone` to `"2"` and re-running — it must be rejected with a message naming *ping/ze*. Restore it.

- [ ] **Step 6: Verify the reading apparatus**

Open `http://localhost:8000/rooms/poetry.html`.

1. All three poems render with their characters, and the reconstruction notice is visible above them.
2. Hover a character. The gloss panel shows the character, pinyin, sense, and tone marked as reconstructed.
3. **Tab to a character and verify the gloss appears on focus too**, not only on hover. This is the accessibility requirement in the spec.
4. Press "Show tone pattern". Marks appear beneath each line, aligned under their characters. Verify the poem's own line spacing did not shift when they appeared.
5. Press it again. Marks disappear and the button label and `aria-pressed` both revert.
6. Press "Show literal translation". The translation swaps, the label becomes "Show literary translation", and pressing again swaps back.

- [ ] **Step 7: Verify accessibility and the no-JS path**

1. Keyboard-only: every character and both toggles are reachable, focus is always visible.
2. Verify the gloss region announces changes — it has `role="status"` and `aria-live="polite"`.
3. Disable JavaScript and reload. Verify the full text of all three poems and both translations are readable.
4. At 360px wide, verify poem lines wrap or scroll within their container without the page scrolling horizontally.
5. Verify Chinese text carries `lang="zh-Hans"` in the inspector, on both the characters and the poem titles.

- [ ] **Step 8: Self-host the Noto Serif SC subset**

Now that `poems.json` exists, the needed character set is known.

1. Extract the characters actually used:

```bash
python3 - <<'PY'
import json, pathlib
chars = set()
for poem in json.loads(pathlib.Path("data/poems.json").read_text(encoding="utf-8")):
    chars.update(poem["title"])
    for line in poem["lines"]:
        chars.update(c["char"] for c in line["characters"])
print("".join(sorted(chars)))
PY
```

2. Download the Noto Serif SC static TTF from the Google Fonts GitHub release (`notofonts/noto-cjk`), which is licensed under the SIL Open Font License.
3. Subset it with `fonttools` — a one-time authoring tool, not a runtime or build dependency:

```bash
python3 -m pip install --user fonttools brotli
pyftsubset NotoSerifSC-Regular.otf \
  --text="<the characters printed above>" \
  --flavor=woff2 --output-file=assets/fonts/noto-serif-sc-subset.woff2
```

4. Add the `@font-face` rule to `css/tokens.css`, above `:root`:

```css
@font-face {
  font-family: "Noto Serif SC";
  src: url("../assets/fonts/noto-serif-sc-subset.woff2") format("woff2");
  font-weight: 400;
  font-display: swap;
  unicode-range: U+4E00-9FFF, U+3400-4DBF;
}
```

5. Record the font's license in `assets/fonts/CREDITS.md`: SIL Open Font License 1.1, with the source release URL.
6. Verify: reload the poetry room and confirm in devtools Network that the subset woff2 loads and is under roughly 30 KB. Confirm the characters render in the served font, not a system fallback, by checking the Fonts panel of the element inspector.

- [ ] **Step 9: Commit**

```bash
git add data/poems.json js/poem.js rooms/poetry.html css/room.css assets/fonts/
git commit -m "Add poetry room with per-character gloss and tone overlay

Gloss reveals on focus as well as hover. Tone marks are reconstructed
ping/ze categories for Middle Chinese, labelled as reconstruction on the
page, with no audio and no claim to eighth-century pronunciation. Noto Serif
SC subset to the characters actually used and self-hosted under the OFL."
```

---

## Task 12: Cross-link pass and full-site verification

The rooms exist; this task makes them one site.

**Files:**
- Modify: `data/objects.json` (populate `seeAlso`)
- Modify: `data/routes.json` (populate `seeAlso`)
- Modify: `data/timeline.json` (populate `objects`)
- Modify: `tools/validate.py` (add cross-link resolution)
- Modify: `tools/test_validate.py` (test it first)
- Modify: `index.html` (link spine sections to objects)

**Interfaces:**
- Consumes: everything.
- Produces: `tools/validate.py` gains `check_crosslinks(objects, routes, timeline, repo_root) -> list[str]`, called from `main()`.

- [ ] **Step 1: Write the failing test for cross-link resolution**

Append to `tools/test_validate.py`:

```python
class CheckCrosslinks(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        (self.root / "rooms").mkdir(parents=True)
        (self.root / "rooms" / "ceramics.html").write_text("<html></html>", encoding="utf-8")

    def test_resolvable_link_has_no_problems(self):
        objects = [{"id": "jar", "hotspots": [{"seeAlso": ["ceramics.html#jar"]}]}]
        problems = check_crosslinks(objects, {"nodes": []}, [], self.root)
        self.assertEqual(problems, [])

    def test_link_to_missing_page_is_reported(self):
        objects = [{"id": "jar", "hotspots": [{"seeAlso": ["absent.html#jar"]}]}]
        problems = check_crosslinks(objects, {"nodes": []}, [], self.root)
        self.assertTrue(any("absent.html" in p for p in problems))

    def test_link_to_missing_anchor_is_reported(self):
        objects = [{"id": "jar", "hotspots": [{"seeAlso": ["ceramics.html#ghost"]}]}]
        problems = check_crosslinks(objects, {"nodes": []}, [], self.root)
        self.assertTrue(any("ghost" in p for p in problems))

    def test_timeline_object_reference_must_exist(self):
        objects = [{"id": "jar", "hotspots": []}]
        timeline = [{"year": 618, "objects": ["nonexistent"]}]
        problems = check_crosslinks(objects, {"nodes": []}, timeline, self.root)
        self.assertTrue(any("nonexistent" in p for p in problems))
```

Update the import at the top of the file to include `check_crosslinks`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd tools && python3 -m unittest discover -s . -v`

Expected: `ImportError: cannot import name 'check_crosslinks'`.

- [ ] **Step 3: Implement `check_crosslinks` in `tools/validate.py`**

Anchors are object `id` values, which is what `js/zoom.js` sets as each figure's `id`, so a link of `ceramics.html#jar` resolves if and only if an object with that id exists.

```python
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
```

Then call it from `main()`, after the per-file checks, loading each file only if present:

```python
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd tools && python3 -m unittest discover -s . -v`

Expected: all tests PASS, including the four new ones.

- [ ] **Step 5: Populate the cross-links**

Now wire the site together, using the validator as the gate:

1. In `data/objects.json`, give each hotspot a `seeAlso` where a genuine connection exists — a Sogdian groom figure to `changan.html`, a cobalt-glazed piece to `changan.html`, a Buddhist ceramic to `dunhuang.html#<id>`.
2. In `data/routes.json`, point each place at the objects that evidence it — Samarkand to the Sogdian figure, Khotan or Ctesiphon to the relevant material.
3. In `data/timeline.json`, populate each section's `objects` with the ids of objects made in that period.
4. In `index.html`, add a link in each spine section to the objects listed for it, matching the `objects` field you just filled.

Add links only where the connection is real. A forced cross-link is worse than none.

- [ ] **Step 6: Validate the whole site**

Run: `python3 tools/validate.py`

Expected: `All data files valid.` Fix every reported problem — dead anchors are the failure this task exists to prevent.

- [ ] **Step 7: Click every cross-link**

The validator proves links resolve; it cannot prove they land somewhere sensible.

For each `seeAlso` link on the site: click it, confirm the target page loads, confirm the browser scrolls to the intended object, and confirm the connection actually makes sense to a reader. Fix or delete any that do not.

- [ ] **Step 8: Full-site QA pass**

Run all five checks on **every** page — `index.html` and all four rooms:

1. Keyboard-only: reach and operate every control; focus always visible; never trapped.
2. Reduced motion: OS setting on; no animation anywhere, but the era palette still changes.
3. Narrow viewport: 360px; no horizontal page scroll; nothing clipped.
4. JS disabled: every page readable, every image rendered, every `<noscript>` notice visible.
5. Broken data: corrupt each `data/*.json` in turn; confirm a visible inline notice, never a blank section. Restore each file.

Then check contrast: sample body text, links, and button labels against their backgrounds in **both** palettes using the devtools contrast checker. Every pair must meet WCAG AA (4.5:1 for body text, 3:1 for large text). Fix `tokens.css` if any pair fails.

- [ ] **Step 9: Verify the repository is clean and unpushed**

```bash
git status --short --branch
python3 tools/validate.py
cd tools && python3 -m unittest discover -s . -q; cd ..
git log --format="%h %s" | head -20
git log --format="%B" | grep -iE "claude|co-authored|generated with|anthropic" && echo "ATTRIBUTION FOUND — fix before finishing" || echo "commit messages clean"
git remote -v
```

Verify: no `.omc/` paths in status, validator passes, all unit tests pass, no attribution strings in any commit message, and **`git remote -v` prints nothing** — no remote has been added and nothing has been pushed.

- [ ] **Step 10: Commit**

```bash
git add data/ tools/ index.html
git commit -m "Cross-link rooms and validate every link target

Validator now resolves seeAlso targets to real pages and real object
anchors, and checks timeline object references, so a dead cross-link fails
before commit rather than in front of a reader."
```

---

## Deployment (owner action, not a task)

The site is ready to serve from the repository root. To publish:

1. Create an empty repository on GitHub through the web interface.
2. Add it as a remote and push — **this plan deliberately does not do either step.** Publishing is the repository owner's decision.
3. Repository Settings → Pages → deploy from branch, root folder.

No workflow file is needed. There is no build step.

---

## Self-Review

**Spec coverage.** Every spec section maps to a task: architecture and file structure → Tasks 1–2; design system and the four-era mapping → Task 1; data/code boundary and all four record schemas → Tasks 2, 6, 9, 11; `spine.js` → Task 3; `zoom.js` → Tasks 6, 8, 10; `map.js` → Task 9; `poem.js` → Task 11; error handling → verified explicitly in Tasks 6, 9, 11, 12; images and licensing → Tasks 5, 8, 10; accessibility → verified per room and again site-wide in Task 12; testing → Task 7 plus every task's verification steps; build order → task order matches the spec exactly; deployment and commit rules → Global Constraints and the deployment note.

**Contrast is gated twice, deliberately.** Task 1 Step 2 checks the palette tokens
numerically before any page depends on them; Task 12 Step 8 re-checks rendered text
site-wide, which catches pairs the token-level check cannot predict (text over the
rupture section's gradient, button labels on filled backgrounds). The seven token pairs
specified in Task 1 have been verified to pass AA — the lowest is 5.85:1 — so that step
should pass as written unless the values are changed.

**Two spec items needed explicit placement.** The self-hosted CJK font subset has a real ordering dependency — it cannot be subset before `poems.json` exists — so it lands in Task 11 Step 8 with a system-font stack covering the interim. And `check_crosslinks` is deliberately separated from the per-file checks in Task 12, because cross-file validation needs several files loaded at once and would otherwise duplicate loading logic across four independent checks.

**Type consistency.** `checkObject`, `checkRoutes`, and `checkPoem` all return `string[]`; the Python `check_*` functions all return `list[str]`. `createPanZoom` is used only as `panzoomFactory(viewport, stage)` and its `getState` is never called by app code (it exists for console verification). `loadRecords` returns `{ records, skipped }` and every call site destructures exactly those keys. `initZoomRoom`, `initMapRoom`, and `initPoemRoom` all take a single options object with `container` and `dataUrl`; `initZoomRoom` additionally takes `room`. `map.js` deliberately does not use `loadRecords`, and the reason is stated in its Interfaces block, because `routes.json` is an object rather than an array.

---

## Deviations Applied During Implementation

Recorded as built, so the plan and the repository do not disagree.

**1. Image source: Met API → Wikimedia Commons.** `collectionapi.metmuseum.org` and
`images.metmuseum.org` are unreachable from the build network (an allowlist, not an
outage — `api.github.com` and Wikimedia resolve fine). Licences are therefore read from
the Commons API `extmetadata` rather than the Met's `isPublicDomain` flag. The rule did
not change: only `Public domain`, `CC0`, or `PD-*` shipped, `CC BY`/`CC BY-SA` were
rejected because the credit format carries no attribution field, and every value in
`CREDITS.md` came from an API response rather than memory. See `tools/MANIFEST.md`.

**2. `css/room.css` split per room.** The plan had Tasks 6, 9, and 11 all appending to
one stylesheet. Those tasks ran concurrently, which would have raced on that file, so
`room.css` keeps only shared chrome and each room owns `css/zoom.css`, `css/map.css`, or
`css/poem.css`. This also matches the plan's own preference for small focused files.

**3. Tasks 6, 8, and 10 merged into one agent.** Ceramics and Dunhuang share
`data/objects.json`; a single owner is safer than two agents serialized on one file. The
reuse requirement still held and was checked: `js/zoom.js` contains no room-specific
branching, only a filter on the record's `room` field.

**4. Subagents were barred from running git.** Concurrent `git commit` calls race on
`index.lock`. Agents wrote files only; commits were made between waves.

**5. Font subsetting (Task 11 Step 8) deferred.** The Noto CJK release host and PyPI are
unreachable, and `fonttools` is unavailable, so the site relies on the system CJK
fallback. Verified rendering on Windows via SimSun; **unverified on Linux and Android**,
where characters could fall back to a sans face. Recorded in `tools/MANIFEST.md`.

**6. Serif stack reordered Latin-first.** The plan's stack led with `"Noto Serif SC",
"Songti SC", "SimSun"`, which made every Latin letter render in SimSun's fixed-width
Latin glyphs on Windows. Browsers fall back per glyph, so Latin faces now come first and
CJK sits behind them.

**7. No-JS fallback is generated, not hand-written.** The plan called for a static
fallback in each zoom room, but the room pages as first built only carried a notice
claiming "the objects are listed below" while listing nothing — a false promise with
JavaScript off. `tools/build_fallback.py` now generates the block from
`data/objects.json`, and `tools/validate.py` fails when it goes stale, so the duplicated
content cannot drift silently.

**8. Map places became real link targets.** `js/map.js` set no `id` on its nodes, so a
cross-link like `changan.html#samarkand` pointed at nothing. Nodes now carry ids, the
hash selects that place on load, and the validator checks anchors per page — map ids on
`changan.html`, object ids elsewhere.

**9. Timeline sections were centred while the hero was flush left.** Caused by this
plan's own markup putting `.wrap` and `.prose` on the same element, where the auto
margins centre the narrowed column. Fixed by narrowing the children instead.

### Verification actually performed, and what was not

Performed: `tools/validate.py --strict` clean; 24 stdlib unit tests passing; every page
rendered headless at 1280px and 360px and inspected; hotspot placement checked against
each source photograph; the no-JS fallback markup rendered and read; the staleness and
dead-anchor checks each proven to fail on deliberately broken input.

**Not performed — no interactive browser was available.** Hover reveals, Tab focus order
and focus-ring visibility, drag-to-pan, pinch-zoom, `Esc` behaviour, dimmed nodes leaving
the tab order, and the scroll-driven era palette swap were all verified only by reading
the code that implements them. The manual QA checklist in this plan remains the real
gate for those, and it has not been run.

**Screenshots of this site require `--virtual-time-budget`.** Content is fetched and
rendered asynchronously; without that flag a screenshot captures the static "Loading…"
placeholder and reads as a broken page.
