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

  // The panel reserves its height so revealing a gloss does not shift the poem.
  // Left empty it reads as a broken box, so give it a resting instruction that
  // the first hover or focus replaces.
  gloss.append(
    el("span", {
      class: "gloss-hint",
      text: "Hover or focus a character for its sense, reading, and tone class.",
    })
  );

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
