import { el, qs } from "./lib/dom.js";
import { loadRecords, renderFailure, DataLoadError } from "./lib/data.js";
import { revealOnEnter } from "./lib/reveal.js";

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

function renderObject(record, panzoomFactory, position) {
  const figure = el("figure", { class: "object reveal", id: record.id });

  const viewport = el("div", { class: "zoom-viewport plate-frame" });
  const stage = el("div", { class: "zoom-stage" });
  const image = el("img", {
    src: record.image.src,
    alt: `${record.title}. ${record.summary ?? ""}`,
    style: `aspect-ratio: ${record.image.aspect ?? "1/1"}`,
    decoding: "async",
    // Only the first object in a room is above the fold; the rest are large
    // museum files worth deferring until the reader scrolls to them.
    loading: position === 0 ? "eager" : "lazy",
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
      }, [
        el("span", { class: "hotspot-index", "aria-hidden": "true",
          text: String(index + 1) }),
      ])
    );
  });

  viewport.append(stage);

  const controls = el("div", { class: "zoom-controls" });
  let pz = panzoomFactory(viewport, stage);

  // Past 1:1 there is no more detail in the file, only interpolation, so the
  // ceiling is the image's own resolution. It is only knowable once the file
  // has loaded, and the controller takes its limits at construction, so the
  // controller is rebuilt then. Every caller reads `pz` through a closure, so
  // the swap is invisible to them.
  image.addEventListener("load", () => {
    if (!image.naturalWidth || !image.clientWidth) return;
    pz.destroy();
    pz = panzoomFactory(viewport, stage, {
      maxScale: Math.max(1, image.naturalWidth / image.clientWidth),
    });
  });

  controls.append(
    el("button", { type: "button", text: "Zoom in",
      onclick: () => pz.zoomBy(0.25) }),
    el("button", { type: "button", text: "Zoom out",
      onclick: () => pz.zoomBy(-0.25) }),
    el("button", { type: "button", text: "Reset view", onclick: () => pz.reset() })
  );

  // The museum photographs carry their studio backgrounds unaltered, so the
  // viewport is matted onto a dark plate rather than sitting on the paper.
  const plate = el("div", { class: "object-plate plate" }, [
    controls,
    viewport,
    el("p", { class: "plate-caption",
      text: "Drag to pan. Arrow keys pan, plus and minus zoom, Esc resets the view. Numbered rings mark the annotated details." }),
  ]);

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
    plate,
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

  container.replaceChildren(
    ...objects.map((record, position) => renderObject(record, createPanZoom, position))
  );
  revealOnEnter(container);

  if (result.skipped.length > 0) {
    container.append(
      el("p", { class: "notice", role: "status",
        text: `${result.skipped.length} record(s) were skipped as malformed: ${result.skipped.join(" | ")}` })
    );
  }
}
