import { el, qs } from "./lib/dom.js";
import { renderFailure, DataLoadError } from "./lib/data.js";
import { revealOnEnter } from "./lib/reveal.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const LAYERS = [
  { id: "goods", label: "Traded goods" },
  { id: "religions", label: "Religions" },
  { id: "quarters", label: "Foreign quarters" },
];

// Chang'an is named here for the same reason it is named in selectFromHash
// below: it is the subject of the room, the point everything converges on, and
// the only node whose marker is a city plan rather than a dot.
const CAPITAL_ID = "changan";

// Framed to the node coordinates actually in use (x 110-860, y 210-460) with
// room above for the Tian Shan, below for the Yangtze, and to the east for the
// coastline and Chang'an's plan.
const VIEW_BOX = "60 120 960 430";
const PLATE_MARK = { x: 66, y: 126, width: 948, height: 418 };

/* ---- Terrain ------------------------------------------------------------
   Hand-authored, and kept in this file rather than inline in changan.html
   because every coordinate below is meaningless except against VIEW_BOX, which
   also lives here. Split across two files, one would drift out from under the
   other with nothing to catch it. Drawn to fit the node positions in
   routes.json; no node was moved to fit the terrain. */

const COASTLINE =
  "M930 120C960 190 1000 230 995 275C990 300 975 318 958 338" +
  "C930 375 880 410 845 448C820 478 790 505 740 550";
const SEA = `${COASTLINE}L1020 550L1020 120Z`;

const RIVERS = [
  {
    id: "yellow-river",
    label: "Yellow River",
    offset: "72%",
    d: "M610 394C650 364 664 326 682 296C698 268 688 236 714 220" +
       "C748 200 792 206 810 226C826 242 866 234 900 228C932 222 954 228 974 236",
  },
  {
    id: "yangtze",
    label: "Yangtze",
    // Kept west of Guangzhou's label, which sits at the eastern end of the same
    // band of the sheet.
    offset: "10%",
    d: "M634 486C690 476 726 458 772 448C812 440 848 420 878 402",
  },
];

// The basin the oasis routes run around, sitting inside the lens the
// Samarkand-Kucha-Dunhuang-Khotan edges make.
const TAKLAMAKAN =
  "M344 258C372 244 404 236 442 240C486 244 528 250 552 264" +
  "C566 274 552 286 522 292C476 300 420 298 380 290C350 284 334 268 344 258Z";

// Ranges are chains of hachure peaks: [apex x, height, half width], with
// heights and spacings varied by hand so a range does not read as a machined
// zigzag.
const RANGES = [
  {
    label: "Tian Shan",
    labelAt: [428, 158],
    baseline: 194,
    peaks: [[298, 22, 15], [327, 14, 11], [356, 26, 17], [389, 17, 12],
            [420, 28, 18], [455, 16, 12], [488, 23, 16], [518, 13, 10],
            [548, 20, 14], [574, 14, 11]],
  },
  {
    label: "Kunlun Shan",
    labelAt: [604, 386],
    baseline: 362,
    peaks: [[330, 19, 13], [358, 13, 10], [389, 22, 15], [422, 15, 11],
            [455, 21, 14], [488, 13, 10], [519, 19, 13], [549, 14, 11],
            [578, 17, 12]],
  },
];

// Chang'an's walled plan, in coordinates local to its node, so the whole plan
// travels with the node transform and carries no absolute positions of its own.
const CITY = {
  halfWidth: 62,
  halfHeight: 50,
  wallInset: 3.5,
  wardColumns: 8,
  wardRows: 6,
  palace: { x: -22, y: -50, width: 44, height: 24 },
  imperialCity: { x: -18, y: -26, width: 36, height: 17 },
  markets: [
    { x: -44, y: -8, width: 19, height: 19 },
    { x: 25, y: -8, width: 19, height: 19 },
  ],
  labelY: 74,
};

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

function svgText(attrs, text) {
  const node = svg("text", attrs);
  node.textContent = text;
  return node;
}

// Each peak is an open two-stroke caret. Left unclosed on purpose: SVG fills an
// open subpath as though closed but strokes only the segments actually drawn,
// so the peaks get an opaque body that hides the row behind them without also
// drawing a horizontal line along every base.
function peakPath(peaks, baseline, scale = 1) {
  return peaks
    .map(([x, height, halfWidth]) => {
      const width = halfWidth * scale;
      return `M${x - width} ${baseline}L${x} ${baseline - height * scale}` +
             `L${x + width} ${baseline}`;
    })
    .join("");
}

// A second row of smaller peaks, set between and above the front row, so a
// chain reads as a range with depth rather than as one saw-toothed line.
function backRow({ baseline, peaks }) {
  const between = peaks.slice(0, -1).map(([x, height, halfWidth], index) => [
    (x + peaks[index + 1][0]) / 2, height, halfWidth,
  ]);
  return peakPath(between, baseline - 8, 0.62);
}

function buildSandPattern() {
  const pattern = svg("pattern", {
    id: "map-sand", width: 13, height: 13, patternUnits: "userSpaceOnUse",
  });
  for (const [cx, cy, r] of [[2, 3, 0.85], [8, 7, 0.85], [5, 11, 0.7], [11, 1, 0.6]]) {
    pattern.append(svg("circle", { cx, cy, r, class: "sand-grain" }));
  }
  return pattern;
}

function buildTerrain() {
  // aria-hidden because the terrain carries nothing the plate's caption and the
  // list of places below it do not already say in words.
  const group = svg("g", { class: "terrain", "aria-hidden": "true" });

  group.append(
    svg("path", { d: SEA, class: "sea" }),
    svg("path", { d: COASTLINE, class: "coastline" }),
    svg("path", { d: TAKLAMAKAN, class: "desert" }),
    svg("path", { d: TAKLAMAKAN, class: "sand", fill: "url(#map-sand)" })
  );

  for (const range of RANGES) {
    group.append(
      svg("path", { d: backRow(range), class: "range range-far" }),
      svg("path", { d: peakPath(range.peaks, range.baseline), class: "range" }),
      svgText({ x: range.labelAt[0], y: range.labelAt[1],
        class: "terrain-label", "text-anchor": "middle" }, range.label)
    );
  }

  group.append(svgText(
    { x: 448, y: 274, class: "terrain-label", "text-anchor": "middle" },
    "Taklamakan"
  ));

  for (const river of RIVERS) {
    const id = `map-${river.id}`;
    group.append(svg("path", { id, d: river.d, class: "river" }));
    const label = svg("text", { class: "river-label", dy: -6 });
    const along = svg("textPath", { href: `#${id}`, startOffset: river.offset });
    along.textContent = river.label;
    label.append(along);
    group.append(label);
  }

  return group;
}

function buildCityPlan() {
  const group = svg("g", { class: "city-plan" });
  const { halfWidth, halfHeight, wallInset } = CITY;
  const inset = {
    x: -halfWidth + wallInset,
    y: -halfHeight + wallInset,
    width: (halfWidth - wallInset) * 2,
    height: (halfHeight - wallInset) * 2,
  };

  // Filled opaque first, so the plan sits on the sheet rather than on the
  // terrain and the routes from Dunhuang and Guangzhou stop at the walls.
  group.append(svg("rect", {
    x: -halfWidth, y: -halfHeight, width: halfWidth * 2, height: halfHeight * 2,
    class: "city-fill",
  }));

  const wards = svg("g", { class: "city-wards" });
  for (let column = 1; column < CITY.wardColumns; column += 1) {
    const x = inset.x + (inset.width / CITY.wardColumns) * column;
    wards.append(svg("line", { x1: x, y1: inset.y, x2: x, y2: inset.y + inset.height }));
  }
  for (let row = 1; row < CITY.wardRows; row += 1) {
    const y = inset.y + (inset.height / CITY.wardRows) * row;
    wards.append(svg("line", { x1: inset.x, y1: y, x2: inset.x + inset.width, y2: y }));
  }
  group.append(wards);

  // Zhuque Avenue running south from the palace, and the east-west axis, drawn
  // heavier than the ward lanes.
  const avenues = svg("g", { class: "city-avenue" });
  avenues.append(svg("line", { x1: 0, y1: -9, x2: 0, y2: halfHeight }));
  avenues.append(svg("line", { x1: inset.x, y1: 0, x2: inset.x + inset.width, y2: 0 }));
  group.append(avenues);

  group.append(
    svg("rect", { ...CITY.palace, class: "city-palace" }),
    svg("rect", { ...CITY.imperialCity, class: "city-palace" })
  );
  for (const market of CITY.markets) {
    group.append(svg("rect", { ...market, class: "city-market" }));
  }

  group.append(
    svg("rect", { ...inset, class: "city-wall-inner" }),
    svg("rect", {
      x: -halfWidth, y: -halfHeight, width: halfWidth * 2, height: halfHeight * 2,
      class: "city-wall",
    })
  );

  return group;
}

/* ---- Nodes -------------------------------------------------------------- */

// The only hierarchy the data itself contains is how many kinds of traffic a
// place carried, so that is what the marker sizes report. Chang'an is the
// exception and gets its plan.
function nodeTier(node) {
  if (node.id === CAPITAL_ID) return "capital";
  if (node.layers.length >= 3) return "major";
  return node.layers.length === 1 ? "minor" : "middling";
}

function buildMarker(tier) {
  if (tier === "capital") return [buildCityPlan()];
  if (tier === "major") {
    return [
      svg("circle", { r: 11.5, class: "node-ring" }),
      svg("circle", { r: 6, class: "node-dot" }),
    ];
  }
  if (tier === "minor") return [svg("circle", { r: 5, class: "node-dot-open" })];
  return [svg("circle", { r: 6, class: "node-dot" })];
}

// Labels sit to the right of their marker, except in the eastern quarter of the
// sheet where there is no room before the coast. Chang'an's sits below the plan
// and to the west of it, clear of the route arriving from Guangzhou in the south.
function labelPlacement(node, tier, bounds) {
  if (tier === "capital") {
    return { x: -CITY.halfWidth + 4, y: CITY.labelY, anchor: "end" };
  }
  const eastern = node.x > bounds.minX + (bounds.maxX - bounds.minX) * 0.7;
  return eastern ? { x: -16, y: 5, anchor: "end" } : { x: 16, y: 5, anchor: "start" };
}

function buildLabel(node, number, tier, bounds) {
  const place = labelPlacement(node, tier, bounds);
  const label = svg("text", {
    x: place.x, y: place.y, "text-anchor": place.anchor,
    class: `node-label tier-${tier}`,
  });
  // Two spans, so the narrow-width stylesheet can drop the name and leave the
  // numeral standing: below about 40rem no label small enough to fit is legible.
  const numeral = svg("tspan", { class: "node-index" });
  numeral.textContent = number;
  const name = svg("tspan", { class: "node-name", dx: 7 });
  name.textContent = node.name;
  label.append(numeral, name);
  return label;
}

function buildMap(data, onSelect) {
  const byId = new Map(data.nodes.map((node) => [node.id, node]));
  const bounds = {
    minX: Math.min(...data.nodes.map((node) => node.x)),
    maxX: Math.max(...data.nodes.map((node) => node.x)),
  };

  const root = svg("svg", {
    viewBox: VIEW_BOX,
    class: "route-map",
    // role="group" rather than "img": an img hides its own subtree, and the
    // node markers below are real focusable buttons that must stay exposed.
    role: "group",
    "aria-label": "Schematic map of trade routes converging on Chang'an",
  });

  const defs = svg("defs");
  defs.append(buildSandPattern());
  root.append(
    defs,
    buildTerrain(),
    svg("rect", { ...PLATE_MARK, class: "plate-mark",
      "vector-effect": "non-scaling-stroke", "aria-hidden": "true" })
  );

  const edgeGroup = svg("g", { class: "edges", "aria-hidden": "true" });
  (data.edges ?? []).forEach((edge, index) => {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) return;
    const line = {
      x1: from.x, y1: from.y, x2: to.x, y2: to.y,
      // pathLength normalises the dash length used by the ink-in animation, so
      // every route draws over the same duration regardless of its real length.
      pathLength: 100,
      style: `animation-delay: ${index * 70}ms`,
    };
    edgeGroup.append(
      svg("line", { ...line, class: "edge-casing" }),
      svg("line", { ...line, class: "edge" })
    );
  });
  root.append(edgeGroup);

  const nodeButtons = [];
  data.nodes.forEach((node, index) => {
    const tier = nodeTier(node);
    const group = svg("g", {
      // The id makes each place a real link target, so an object's hotspot can
      // point at changan.html#samarkand and land somewhere meaningful.
      id: node.id,
      class: `node tier-${tier}`,
      "data-layers": node.layers.join(" "),
      transform: `translate(${node.x} ${node.y})`,
    });
    group.append(...buildMarker(tier), buildLabel(node, index + 1, tier, bounds));

    // A focusable SVG element needs an explicit role and tabindex to behave
    // like a button for keyboard and assistive technology.
    group.setAttribute("tabindex", "0");
    group.setAttribute("role", "button");
    group.setAttribute("aria-label",
      `${index + 1}. ${node.name}. Show what arrived from here.`);
    group.addEventListener("click", () => onSelect(node));
    group.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onSelect(node);
    });

    root.append(group);
    nodeButtons.push(group);
  });

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

function buildCaption() {
  return el("figcaption", { class: "plate-caption map-note" }, [
    el("p", { text: "The numerals key each place to the list below the plate." }),
    el("p", { text:
      "This is a schematic, not a cartographically accurate map. Positions are " +
      "relative, not surveyed. The coastline, rivers, desert, and mountain ranges " +
      "behind the routes were drawn to fit those relative positions and are not " +
      "survey data either — no shape on this sheet should be read as the shape of " +
      "the ground, and no point on it as a location." }),
    el("p", { text:
      "The plan at the eastern terminus is Chang'an: the palace enclosure against " +
      "the north wall with the administrative city below it, the grid of walled " +
      "wards, and the two great markets marked in colour either side of the " +
      "central avenue." }),
  ]);
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

  // A place can point at more than one room, so name the destination. Repeating
  // "See the objects" would give a reader two identical links to choose between.
  const LINK_LABELS = {
    "ceramics.html": "See the ceramics →",
    "dunhuang.html": "See the Buddhist art →",
    "poetry.html": "Read the poetry →",
  };

  function linkLabel(href) {
    const [page, anchor] = href.split("#");
    const base = LINK_LABELS[page] ?? "See the objects →";
    return anchor ? base.replace(" →", ": this object →") : base;
  }

  function showNode(node) {
    detail.replaceChildren(
      el("p", { class: "panel-eyebrow", text: "What arrived from" }),
      el("h3", { text: node.name }),
      el("p", { text: node.body }),
      ...(node.seeAlso ?? []).map((href) =>
        el("p", { class: "panel-link" }, [el("a", { href, text: linkLabel(href) })])
      )
    );
    for (const group of nodeButtons) {
      group.classList.toggle("is-selected", group.id === node.id);
    }
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
    el("figure", { class: "map-plate plate reveal" }, [
      el("p", { class: "plate-eyebrow",
        text: "The eastern trade system in the eighth century" }),
      toggles,
      el("div", { class: "plate-frame" }, [root]),
      buildCaption(),
    ]),
    detail,
    el("hr", { class: "rule-fret map-divider" }),
    el("h2", { class: "map-key-heading", text: "Places in text" }),
    el("dl", { class: "hotspot-list map-key" },
      data.nodes.flatMap((node, index) => [
        el("dt", {}, [
          el("span", { class: "key-index", text: String(index + 1) }),
          node.name,
        ]),
        el("dd", { text: node.body }),
      ])
    )
  );

  // Arriving from another room's cross-link (changan.html#samarkand) should
  // select that place, not merely scroll near its dot. Falls back to Chang'an,
  // where everything on the map converges.
  function selectFromHash() {
    const wanted = decodeURIComponent(location.hash.replace("#", ""));
    const node =
      data.nodes.find((candidate) => candidate.id === wanted) ??
      data.nodes.find((candidate) => candidate.id === CAPITAL_ID) ??
      data.nodes[0];
    showNode(node);
    return node;
  }

  selectFromHash();
  window.addEventListener("hashchange", selectFromHash);
  applyLayers();
  revealOnEnter(container);
}
