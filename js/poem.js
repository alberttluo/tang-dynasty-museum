import { el } from "./lib/dom.js";
import { loadRecords, renderFailure, DataLoadError } from "./lib/data.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const TONES = new Set(["level", "oblique"]);

/* The two reconstructed ping/ze classes, named in English and in Chinese.
   Nothing here describes a pitch: these are metrical categories recovered from
   rhyme books, and the room makes no claim about how a syllable was said. */
const TONE_CLASS = {
  level: { name: "level", pinyin: "píng", han: "平" },
  oblique: { name: "oblique", pinyin: "zè", han: "仄" },
};

/* Positions two and four -- and six in a seven-character line -- are where the
   level/oblique pattern is binding. The odd positions are free. */
const isStrictPosition = (index) => index % 2 === 1;

const CHARACTER_WORD = { 4: "Four", 5: "Five", 6: "Six", 7: "Seven" };
const LINE_FORM = {
  4: { name: "quatrain", han: "绝句" },
  8: { name: "regulated verse", han: "律诗" },
};

/* Lattice geometry, in viewBox units. The whole figure scales with its box, so
   these are proportions rather than pixels. */
const LATTICE = {
  gutter: 26,      // left column: line number and couplet bracket
  cell: 34,
  row: 30,
  coupletGap: 12,
  header: 26,      // room above the grid for the position numbers
  pad: 10,
  radius: 6.5,
};

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

/* lib/dom.js builds HTML elements; SVG needs its own namespace, and there is
   no second consumer of this yet to justify moving it into lib. */
function svgEl(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null) continue;
    if (key === "text") node.textContent = value;
    else node.setAttribute(key, String(value));
  }
  for (const child of [].concat(children)) {
    if (child != null) node.append(child);
  }
  return node;
}

/* The mark is drawn rather than set as a character, so it does not depend on
   the font shipping U+25CB and U+25CF. */
const toneMark = (tone) =>
  el("span", { class: "tone-mark", dataset: { tone }, "aria-hidden": "true" });

/* Derived from the shape of the record rather than asserted, so adding a poem
   stays a data edit. Lines of unequal length get no label. */
function formLabel(record) {
  const form = LINE_FORM[record.lines.length];
  const counts = new Set(record.lines.map((line) => line.characters.length));
  if (!form || counts.size !== 1) return null;

  const [count] = counts;
  const word = CHARACTER_WORD[count];
  return {
    text: word ? `${word}-character ${form.name}` : `${form.name}, ${count} a line`,
    han: form.han,
  };
}

function renderCharacter(char, gloss, grid) {
  const tone = TONE_CLASS[char.tone];
  const button = el("button", {
    type: "button",
    class: "poem-char",
    lang: "zh-Hans",
    text: char.char,
    dataset: { tone: char.tone },
    "aria-label":
      `${char.char}, ${char.pinyin}, meaning ${char.gloss}. Reconstructed ${tone.name} category.`,
  });

  // Gloss reveals on focus as well as hover; hover alone would exclude
  // keyboard and touch users entirely.
  const show = () => {
    for (const other of grid.querySelectorAll(".poem-char.is-glossed")) {
      other.classList.remove("is-glossed");
    }
    button.classList.add("is-glossed");
    gloss.replaceChildren(
      el("span", { class: "gloss-char", lang: "zh-Hans", text: char.char }),
      el("span", { class: "gloss-pinyin", text: char.pinyin }),
      el("span", { class: "gloss-sense", text: char.gloss }),
      el("span", { class: "gloss-tone" }, [
        toneMark(char.tone),
        `${tone.name} — reconstructed `,
        el("span", { lang: "zh-Hans", text: tone.han }),
        ` ${tone.pinyin} category`,
      ])
    );
  };

  button.addEventListener("mouseenter", show);
  button.addEventListener("focus", show);
  return button;
}

const latticeColX = (index) => LATTICE.gutter + index * LATTICE.cell + LATTICE.cell / 2;

const latticeRowY = (index) =>
  LATTICE.header + index * LATTICE.row
  + Math.floor(index / 2) * LATTICE.coupletGap + LATTICE.row / 2;

/* The pattern of a whole poem as one figure. Two things are meant to be
   readable without counting anything out: the tinted columns show where the
   pattern is binding, and a bar between two dots shows the couplet taking
   opposite categories at that position. A tinted column with no bar is
   therefore a visible hole rather than something to work out mark by mark. */
function buildToneLattice(record, columns) {
  const rows = record.lines.length;
  const width = LATTICE.gutter + columns * LATTICE.cell + LATTICE.pad;
  const height = latticeRowY(rows - 1) + LATTICE.row / 2 + LATTICE.pad;
  const parts = [];

  for (let col = 0; col < columns; col += 1) {
    if (!isStrictPosition(col)) continue;
    parts.push(svgEl("rect", {
      class: "lattice-band",
      x: LATTICE.gutter + col * LATTICE.cell + 2,
      y: LATTICE.header - 6,
      width: LATTICE.cell - 4,
      height: height - LATTICE.header - LATTICE.pad + 6,
    }));
  }

  for (let col = 0; col < columns; col += 1) {
    parts.push(svgEl("text", {
      class: isStrictPosition(col) ? "lattice-label is-strict" : "lattice-label",
      x: latticeColX(col),
      y: LATTICE.header - 12,
      "text-anchor": "middle",
      text: String(col + 1),
    }));
  }

  record.lines.forEach((line, row) => {
    const y = latticeRowY(row);
    parts.push(svgEl("text", {
      class: "lattice-label", x: 3, y: y + 3.5, text: String(row + 1),
    }));
    line.characters.forEach((char, col) => {
      parts.push(svgEl("circle", {
        class: char.tone === "level" ? "lattice-ring" : "lattice-disc",
        cx: latticeColX(col), cy: y, r: LATTICE.radius,
      }));
    });
  });

  for (let row = 0; row + 1 < rows; row += 2) {
    const top = latticeRowY(row);
    const bottom = latticeRowY(row + 1);
    parts.push(svgEl("path", {
      class: "lattice-bracket",
      d: `M22 ${top - 9} H18 V${bottom + 9} H22`,
    }));

    const upper = record.lines[row].characters;
    const lower = record.lines[row + 1].characters;
    for (let col = 0; col < Math.min(upper.length, lower.length); col += 1) {
      if (upper[col].tone === lower[col].tone) continue;
      parts.push(svgEl("line", {
        class: "lattice-rung",
        x1: latticeColX(col), y1: top + LATTICE.radius + 3,
        x2: latticeColX(col), y2: bottom - LATTICE.radius - 3,
      }));
    }
  }

  const spoken = record.lines
    .map((line, index) =>
      `Line ${index + 1}: ${line.characters.map((char) => char.tone).join(", ")}`)
    .join(". ");

  return el("figure", { class: "tone-lattice" }, [
    svgEl("svg", {
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label":
        `Reconstructed level and oblique pattern: ${rows} lines of ${columns}. ${spoken}.`,
    }, parts),
    el("div", { class: "tone-legend", "aria-hidden": "true" }, [
      el("span", {}, [toneMark("level"), "level"]),
      el("span", {}, [toneMark("oblique"), "oblique"]),
    ]),
    el("figcaption", {
      text: "Rows are lines and columns are character positions. An open ring is a level "
        + "syllable, a filled dot an oblique one. The tinted columns are positions two and "
        + "four, where the pattern is binding; a bar joining two dots marks a position "
        + "where the couplet's two lines take opposite categories, which is what the form "
        + "asks for, so a tinted column with no bar is a position where this poem does not "
        + "oppose. Rings and dots are reconstructed categories, not pitches.",
    }),
  ]);
}

function renderPoem(record) {
  const columns = Math.max(...record.lines.map((line) => line.characters.length));

  const article = el("article", { class: "poem reveal", id: record.id });
  article.style.setProperty("--poem-columns", String(columns));
  // The column count is only known here, so the cell width css/poem.css sizes
  // the characters from is composed here too. Container query units resolve it
  // against the rendered grid, which is what keeps a wide line from overflowing
  // a narrow plate.
  article.style.setProperty(
    "--poem-cell",
    `calc((100cqw - ${columns - 1} * var(--poem-gap)) / ${columns})`
  );

  // The panel reserves its height so revealing a gloss does not shift the poem.
  // Left empty it reads as a broken box, so give it a resting instruction that
  // the first hover or focus replaces.
  const gloss = el("div", { class: "poem-gloss", role: "status", "aria-live": "polite" }, [
    el("span", {
      class: "gloss-hint",
      text: "Hover or focus a character for its sense, reading, and reconstructed tone class.",
    }),
  ]);

  const grid = el("div", { class: "poem-grid" });
  for (let index = 0; index < record.lines.length; index += 2) {
    const couplet = el("div", { class: "poem-couplet" });
    for (const line of record.lines.slice(index, index + 2)) {
      const row = el("div", { class: "poem-line" });
      for (const char of line.characters) {
        row.append(renderCharacter(char, gloss, grid));
      }
      // The marks are appended after every character in the line so they fall
      // into the grid's second row rather than interleaving with row one.
      for (const char of line.characters) {
        row.append(el("span", { class: "tone-mark-cell" }, [toneMark(char.tone)]));
      }
      couplet.append(row);
    }
    grid.append(couplet);
  }

  const translationLabel = el("p", {
    class: "poem-translation-label", text: "Literary translation",
  });
  const translation = el("p", {
    class: "poem-translation", text: record.translations.literary,
  });

  const toneToggle = el("button", {
    type: "button", class: "poem-toggle", "aria-pressed": "false",
    text: "Show tone pattern",
    onclick: (event) => {
      const on = article.classList.toggle("show-tones");
      event.currentTarget.setAttribute("aria-pressed", String(on));
      event.currentTarget.textContent = on ? "Hide tone pattern" : "Show tone pattern";
    },
  });

  let literal = false;
  const translationToggle = el("button", {
    type: "button", class: "poem-toggle", "aria-pressed": "false",
    text: "Show literal translation",
    onclick: (event) => {
      literal = !literal;
      translation.textContent = literal
        ? record.translations.literal
        : record.translations.literary;
      translationLabel.textContent = literal
        ? "Literal translation"
        : "Literary translation";
      event.currentTarget.setAttribute("aria-pressed", String(literal));
      event.currentTarget.textContent = literal
        ? "Show literary translation"
        : "Show literal translation";
    },
  });

  const form = formLabel(record);

  article.append(
    el("header", { class: "poem-heading" }, [
      el("h2", { class: "poem-title", lang: "zh-Hans", text: record.title }),
      el("p", { class: "poem-title-gloss", text: record.titleGloss }),
      el("p", { class: "poem-meta" }, [
        record.author,
        form ? ` · ${form.text} ` : null,
        form ? el("span", { lang: "zh-Hans", text: form.han }) : null,
        ` · ${record.lines.length} lines of ${columns}`,
      ]),
      el("p", { class: "prose poem-context", text: record.context }),
    ]),
    el("div", { class: "plate poem-plate" }, [
      grid,
      gloss,
      el("div", { class: "poem-apparatus" }, [toneToggle, translationToggle]),
      buildToneLattice(record, columns),
      el("div", {}, [translationLabel, translation]),
    ])
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
