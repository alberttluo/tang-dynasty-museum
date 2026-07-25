/**
 * Calls onEnter(element) when an element crosses the viewport's middle band.
 * rootMargin shrinks the root to a horizontal band so exactly one section
 * is "current" during normal scrolling.
 */
export function observeSections(elements, onEnter, options = {}) {
  const { rootMargin = "-45% 0px -45% 0px" } = options;

  if (typeof IntersectionObserver !== "function") {
    return { disconnect() {} };
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) onEnter(entry.target);
      }
    },
    { rootMargin, threshold: 0 }
  );

  for (const element of elements) observer.observe(element);
  return { disconnect: () => observer.disconnect() };
}
