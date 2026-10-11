// Brief feedback follows a completed state change. It never delays data,
// navigation, focus or live announcements, and stops when motion is reduced.
const running = new Map();
let preference;

function play(elements, frames, token, easing) {
  preference ??= window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!preference.onchange) preference.onchange = () => {
    if (preference.matches) {
      for (const animation of running.values()) animation.cancel();
      running.clear();
    }
  };
  if (preference.matches || document.hidden) return;
  const styles = getComputedStyle(document.documentElement);
  for (const element of elements.filter(Boolean)) {
    running.get(element)?.cancel();
    if (!element.getClientRects().length || !element.animate) continue;
    const bounds = element.getBoundingClientRect();
    if (bounds.bottom < 0 || bounds.top > innerHeight) continue;
    const animation = element.animate(frames, {
      duration: parseFloat(styles.getPropertyValue(token)),
      easing: styles.getPropertyValue(easing).trim(),
    });
    running.set(element, animation);
    const clear = () => { if (running.get(element) === animation) running.delete(element); };
    animation.onfinish = animation.oncancel = clear;
  }
}

export function revealChange(elements) {
  play(elements, [{ opacity: .3, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], "--reveal-duration", "--ease-enter");
}

export function confirmAction(element) {
  play([element], [{ transform: "scale(.97)" }, { transform: "none" }], "--feedback-duration", "--ease-state");
}
