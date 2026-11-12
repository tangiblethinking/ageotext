/**
 * Shared "jump to a guide target and flash it" helper, used by chat Sources and the table of contents.
 * The flash style (`.guide-highlight`, #FFC166) lives in src/app/globals.css.
 */
export const HIGHLIGHT_CLASS = "guide-highlight";
export const HIGHLIGHT_MS = 2000;
/** Fired on window after a programmatic jump so the table of contents can mark the target active. */
export const GUIDE_NAVIGATE_EVENT = "guide:navigate";
/** Fired on window once the guide HTML is in the DOM. */
export const GUIDE_MOUNTED_EVENT = "guide:mounted";

export type GuideNavigateDetail = { id: string };

const timers = new WeakMap<Element, ReturnType<typeof setTimeout>>();

/** Flash the 2s highlight on an element (restarts the animation if it is already running). */
export function flashHighlight(el: HTMLElement) {
  const prev = timers.get(el);
  if (prev) clearTimeout(prev);
  el.classList.remove(HIGHLIGHT_CLASS);
  void el.offsetWidth; // force reflow so the animation restarts
  el.classList.add(HIGHLIGHT_CLASS);
  timers.set(
    el,
    setTimeout(() => {
      el.classList.remove(HIGHLIGHT_CLASS);
      timers.delete(el);
    }, HIGHLIGHT_MS),
  );
}

/**
 * Smooth-scroll to a guide target, flash it, and announce the jump.
 * Returns false when the target is not in the DOM (e.g. guide HTML not loaded yet).
 */
export function scrollToGuideTarget(id: string, opts: { updateHash?: boolean } = {}): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  window.dispatchEvent(new CustomEvent<GuideNavigateDetail>(GUIDE_NAVIGATE_EVENT, { detail: { id } }));
  if (opts.updateHash && window.location.hash !== `#${id}`) {
    // replaceState does not fire hashchange, so NavBar's design-overlay hash sync is untouched.
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${id}`);
  }
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  flashHighlight(el);
  return true;
}
