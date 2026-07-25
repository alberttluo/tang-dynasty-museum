const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function createPanZoom(viewport, target, options = {}) {
  const { minScale = 1, maxScale = 4, step = 0.25 } = options;
  const state = { scale: 1, x: 0, y: 0 };
  const pointers = new Map();
  let lastPinchDistance = 0;

  function apply() {
    target.style.transform =
      `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
  }

  function constrain() {
    // At scale 1 the image is centered; beyond that, limit panning to the
    // overflow so the reader can never drag the object out of view.
    const overflowX = (viewport.clientWidth * (state.scale - 1)) / 2;
    const overflowY = (viewport.clientHeight * (state.scale - 1)) / 2;
    state.x = clamp(state.x, -overflowX, overflowX);
    state.y = clamp(state.y, -overflowY, overflowY);
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
    getState: () => ({ ...state }),
    destroy() {
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
      viewport.removeEventListener("pointercancel", onPointerUp);
      viewport.removeEventListener("wheel", onWheel);
    },
  };
}
