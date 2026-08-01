const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function createPanZoom(viewport, target, options = {}) {
  const { minScale = 1, maxScale = 4, step = 0.25, onChange = () => {} } = options;
  const state = { scale: 1, x: 0, y: 0 };
  const pointers = new Map();
  let lastPinchDistance = 0;

  function apply() {
    target.style.transform =
      `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
    onChange({ ...state, canZoomIn: canZoomIn(), canZoomOut: canZoomOut(), canPan: canPan() });
  }

  function constrain() {
    // Panning is limited to however much the scaled content actually overhangs
    // the viewport. Deriving the overhang from the viewport's own size instead
    // assumes the content exactly fills it at scale 1, and any content that
    // does not -- anything fitted, letterboxed, or overflowing -- then gets
    // clamped to a range that does not describe it.
    const overflowX = Math.max(0, (target.offsetWidth * state.scale - viewport.clientWidth) / 2);
    const overflowY = Math.max(0, (target.offsetHeight * state.scale - viewport.clientHeight) / 2);
    state.x = clamp(state.x, -overflowX, overflowX);
    state.y = clamp(state.y, -overflowY, overflowY);
  }

  function canZoomIn() { return state.scale < maxScale - 0.001; }
  function canZoomOut() { return state.scale > minScale + 0.001; }
  function canPan() {
    return target.offsetWidth * state.scale > viewport.clientWidth + 1 ||
      target.offsetHeight * state.scale > viewport.clientHeight + 1;
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
    getState: () => ({ ...state, canZoomIn: canZoomIn(), canZoomOut: canZoomOut(), canPan: canPan() }),
    destroy() {
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
      viewport.removeEventListener("pointercancel", onPointerUp);
      viewport.removeEventListener("wheel", onWheel);
    },
  };
}
