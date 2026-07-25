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
    // Framed to the node coordinates actually in use (x 110-860, y 210-460,
    // plus circle radius and label width to the right of the easternmost node)
    // rather than a nominal 1000x520 box, which left the top third empty.
    viewBox: "80 170 900 330",
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
      // The id makes each place a real link target, so an object's hotspot can
      // point at changan.html#samarkand and land somewhere meaningful.
      id: node.id,
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

  // Arriving from another room's cross-link (changan.html#samarkand) should
  // select that place, not merely scroll near its dot. Falls back to Chang'an,
  // where everything on the map converges.
  function selectFromHash() {
    const wanted = decodeURIComponent(location.hash.replace("#", ""));
    const node =
      data.nodes.find((candidate) => candidate.id === wanted) ??
      data.nodes.find((candidate) => candidate.id === "changan") ??
      data.nodes[0];
    showNode(node);
    return node;
  }

  selectFromHash();
  window.addEventListener("hashchange", selectFromHash);
  applyLayers();
}
