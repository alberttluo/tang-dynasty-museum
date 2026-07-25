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
