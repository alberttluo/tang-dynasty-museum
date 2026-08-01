import { observeSections } from "./lib/observe.js";
import { revealOnEnter } from "./lib/reveal.js";

const ERAS = ["early", "high", "rupture", "late"];

function applyEra(body, era) {
  if (!ERAS.includes(era)) return;
  for (const name of ERAS) body.classList.toggle(`era-${name}`, name === era);
}

function markRail(links, year) {
  for (const link of links) {
    const current = link.dataset.year === year;
    link.classList.toggle("is-current", current);
    if (current) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  }
}

/**
 * Keeps .is-over-plate on the rail while a dark full-bleed band is behind it.
 * The rail is centred and roughly 40% of the viewport tall, so the root is
 * shrunk to that band and any dark section intersecting it counts. Counting
 * rather than toggling per entry, because two bands can overlap the rail
 * during a fast scroll and the last callback would otherwise win.
 */
function trackPlateBackdrop(rail, bands) {
  if (!rail || bands.length === 0) return { disconnect() {} };
  if (typeof IntersectionObserver !== "function") return { disconnect() {} };

  const covering = new Set();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) covering.add(entry.target);
        else covering.delete(entry.target);
      }
      rail.classList.toggle("is-over-plate", covering.size > 0);
    },
    { rootMargin: "-30% 0px -30% 0px", threshold: 0 }
  );

  for (const band of bands) observer.observe(band);
  return { disconnect: () => observer.disconnect() };
}

export function initSpine(root = document) {
  const sections = Array.from(root.querySelectorAll(".era-section[data-era]"));
  const indicator = root.getElementById
    ? root.getElementById("year-indicator")
    : root.querySelector("#year-indicator");
  const railLinks = Array.from(root.querySelectorAll(".spine-rail a[data-year]"));

  if (sections.length === 0) return { disconnect() {} };

  const body = document.body;

  trackPlateBackdrop(
    root.querySelector(".spine-rail"),
    Array.from(root.querySelectorAll(".plate-band, .rupture-void"))
  );

  return observeSections(sections, (section) => {
    applyEra(body, section.dataset.era);
    if (section.dataset.year) {
      if (indicator) indicator.textContent = section.dataset.year;
      markRail(railLinks, section.dataset.year);
    }
  });
}

initSpine();
revealOnEnter();
