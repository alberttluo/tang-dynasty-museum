# Graphics and Visual Design — Design

Date: 2026-07-31

Supersedes nothing. Extends the "Design system" section of
`2026-07-24-tang-dynasty-site-design.md`, which remains binding on everything it
covers. Where the two conflict, the earlier spec wins on content, accuracy, and
accessibility; this one governs visual treatment.

## Problem

The site is accurate, well-sourced, and visually flat.

- `index.html` — the chronological spine that carries the site's whole argument —
  contains no imagery. Six object photographs exist in the repository and appear
  only inside rooms.
- The four-room index is a bulleted list of text links.
- Object photographs are placed raw. They carry grey-blue museum studio
  backgrounds that fight the cream paper, so they read as pasted in rather than
  composed.
- There are no non-photographic graphics beyond the schematic map. Nothing on the
  page is specifically Tang; the styling would suit any scholarly subject.

The design system in `tokens.css` is sound. The problem is that nothing uses it
ambitiously.

## Register

**Elevated museum catalogue.** The reference points are Getty and Met exhibition
microsites: large plates, generous scroll, real hierarchy, restrained ornament.

The staging is dramatic; the styling is not. No parallax, no scroll-jacking, no
animated flourish. The content is rigorously sourced and the design must not
undercut that by reading as marketing.

## The controlling idea

**Image density performs the argument.**

`timeline.json` assigns objects to only three of the seven era sections. Rather
than filling the gaps, the design uses them:

| Year | Era | Treatment |
| --- | --- | --- |
| 618 | early | No photograph. No early-Tang object exists in the collection, and inventing a stand-in would misrepresent the record. Ornamental and typographic only. |
| 626 | early | No photograph. Cross-links to the Chang'an map. |
| 690 | high | One plate — the bodhisattva. |
| 713 | high | Four objects at once. The crescendo, and the densest moment on the site. |
| 755 | rupture | **No image.** A full-viewport near-black typographic void. |
| 780 | late | Two celadons, thin and cool, with much more negative space than 713. |
| 907 | late | No photograph. Ornament fading out. |

The reader feels the rupture in the layout before reading the prose about it. The
empty `objects` arrays stop being a gap and become the rhythm.

## Photographic treatment

Every photograph is shown with **every pixel unaltered**. No cutouts, no
background removal, no tinting.

Each is matted onto a deep ground — a `.plate` with a `.plate-frame` inside it —
so the studio grey reads as vitrine shadow rather than a mismatched rectangle.

This was chosen over cutting out the backgrounds. Cutting out would look cleaner
but means editing museum files: `CREDITS.md` would have to record that the images
are modified, the camel's fur and the horse's mane would halo, and it is per-image
manual work in a repository with no image tooling. Matting fixes all six at once
in CSS and raises no provenance question at all.

## Design system additions

`tokens.css` gains, without altering any existing token:

- `--plate`, `--plate-mat`, `--plate-edge`, `--plate-ink`, `--plate-muted`,
  `--plate-shadow` — the dark ground, defined per era so it joins the existing
  palette swap.
- `--size-step-4` — a display step above the current scale, for the hero.
- `--ornament` — the motif ink.

`--ornament` is declared on `body`, not `:root`. It aliases `--gold`, and the era
classes that redefine `--gold` sit on `body`; declared on `:root` it would resolve
against `:root`'s `--gold` and never follow the era swap.

`base.css` gains shared components: `.plate`, `.plate-figure`, `.plate-frame`,
`.plate-caption`, `.bleed`, `.ornament` with five motif modifiers, `.rule-fret`,
and `.reveal`.

Type: the hero sets `唐` at display size in the CJK serif alongside "Tang" and the
dates — the only place the site's subject appears as a letterform. Body
typography is unchanged; it was already right.

## Ornament

Four hand-drawn Tang-derived motifs plus two timeline markers: an eight-petal
rosette, a lotus medallion, a ruyi cloud band, a repeating squared-spiral fret
rule, an open circle mark, and a cleft circle for 755.

They are implemented as CSS `mask-image` data URIs rather than `<img>` or an SVG
sprite, for three reasons: a mask takes `background-color`, so the motifs follow
the era palette automatically; a mask is not in the accessibility tree, which is
correct for graphics that carry no meaning; and it avoids external `<use>`
references, which fail under `file://` and add a request per motif.

## New graphics

- **Chang'an map** — drawn terrain beneath the existing routes (Taklamakan, Tian
  Shan, Kunlun, Yellow River, Yangtze, coastline) and a rendered Chang'an ward
  grid at the eastern terminus. The map remains a schematic and still says so;
  the disclaimer is strengthened to cover the added terrain. `routes.json` is
  unchanged — terrain is drawn to fit existing node coordinates, not the reverse.
- **Sancai glaze diagram** (ceramics) — a cross-section showing lead-fluxed glaze
  melting, flowing under gravity, thinning over a raised ridge, and pooling darker
  in the hollow below. It serves a stated success criterion that no current
  graphic serves, and it must agree precisely with the already-sourced hotspot
  text "Glaze that ran, and where it stopped."
- **Ping/ze tone graphic and regulated-verse structure graphic** (poetry) —
  making the alternation within a line and the opposition between the lines of a
  couplet visible at a glance rather than decodable mark by mark.

## Motion

Entrance reveal, sticky chrome, and the existing era cross-fade. Nothing else.

- Scroll is never hijacked. Native scrolling throughout.
- No parallax and no scroll-linked animation. `animation-timeline: view()` was
  considered and rejected: it would mean two behaviours to verify for a purely
  decorative gain.
- `.reveal` is one-shot. Re-hiding content on scroll-out makes a page feel
  unstable and breaks find-in-page.
- The hidden starting state is gated behind `@media (scripting: enabled)`. This
  matters: a bare `.reveal { opacity: 0 }` would leave the page permanently blank
  if the module failed to load, which is precisely the failure mode the original
  spec's progressive-enhancement rule exists to prevent.
- `prefers-reduced-motion: reduce` removes all of it.

## Constraints carried forward

Unchanged from the original spec and non-negotiable here:

- No build step, no dependencies, no frameworks, vanilla ES modules.
- All existing prose survives verbatim. This is a restaging, not a rewrite.
- Every interactive element is a real button, link, or input with a visible focus
  ring; everything is keyboard reachable.
- All visual content is duplicated in text form.
- Both palettes pass WCAG AA for body text and controls — now on the dark plates
  as well as on paper.
- No horizontal scroll at 360px.
- With JavaScript disabled every page remains readable and complete.
- `data/*.json` is the source of truth and is not edited by this work.
- The generated fallback blocks in the zoom rooms are not hand-edited.

## Known consequence

The landing page now loads photographs, several of them 300–830KB, and
`dunhuang-mural.png` is 586KB as a PNG. Everything below the fold is lazy-loaded
and every image reserves its space, but the images are not recompressed.
Recompressing would alter museum files and require a provenance note in
`CREDITS.md` for a purely technical gain; if page weight becomes a real problem,
the honest fix is to record the derivation explicitly rather than to quietly
re-encode.

## Testing

The original spec's per-room manual QA checklist applies unchanged and is
load-bearing. Beyond it, this work adds four checks per page:

1. Contrast on the dark plates, not just on paper, in both era registers.
2. `.bleed` at 360px — full-bleed out of a centred wrapper is the likeliest
   source of horizontal overflow.
3. JavaScript disabled — confirm no `.reveal` element is stuck invisible.
4. The era palette swap still reaches the plate tokens.

`tools/validate.py` and `tools/build_fallback.py --check` must both pass.
