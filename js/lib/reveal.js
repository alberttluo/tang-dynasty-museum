/**
 * Adds .is-visible to each .reveal element the first time it enters the
 * viewport, then stops observing it. One-shot by design: re-hiding content on
 * scroll-out makes a page feel unstable and breaks find-in-page.
 *
 * The hidden starting state lives in CSS behind (scripting: enabled), so a
 * failure here leaves content visible rather than blank.
 */
export function revealOnEnter(root = document) {
  const targets = Array.from(root.querySelectorAll(".reveal"));
  if (targets.length === 0) return { disconnect() {} };

  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduced || typeof IntersectionObserver !== "function") {
    for (const target of targets) target.classList.add("is-visible");
    return { disconnect() {} };
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0 }
  );

  for (const target of targets) observer.observe(target);
  return { disconnect: () => observer.disconnect() };
}
