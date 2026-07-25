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
