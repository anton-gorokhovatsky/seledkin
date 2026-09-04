import { createMorph } from "./morphicons-dom.js";

// Original site shapes. Theme icons name the action, matching the button label.
export const iconPaths = Object.freeze({
  menu: "M1 5H23M1 12H23M1 19H23",
  close: "M4.22 4.22L19.78 19.78M4.22 19.78L19.78 4.22",
  moon: "M20.2 15.4A8.5 8.5 0 0 1 8.6 3.8a8.5 8.5 0 1 0 11.6 11.6Z",
  // Only the disc morphs. Existing rays keep their own fade, avoiding the
  // overlapping copies produced by morphing one crescent into nine strokes.
  sun: "M15.5 12a3.5 3.5 0 1 0-7 0a3.5 3.5 0 1 0 7 0Z",
});

// Shared critically damped spring: short transitions, without bounce.
export const iconSpring = Object.freeze({ stiffness: 900, damping: 60 });

export function initInterfaceMotion() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const bindings = [];

  function bind(button, host, attribute, readIcon, menu = false) {
    if (!host || host.dataset.morphReady) return;
    const svg = menu
      ? document.createElementNS("http://www.w3.org/2000/svg", "svg")
      : host;
    if (menu) {
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      svg.classList.add("floating-menu__morph");
    }
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.classList.add("interface-morph__path");
    const morph = createMorph(path, readIcon(), { reducedMotion: "user" });
    svg.append(path);
    if (menu) host.append(svg);
    host.dataset.morphReady = "true";

    const sync = () => {
      if (reducedMotion.matches || document.hidden || !host.getClientRects().length) morph.set(readIcon());
      else morph.morphTo(readIcon(), iconSpring);
    };
    const observer = new MutationObserver(sync);
    observer.observe(button, { attributes: true, attributeFilter: [attribute] });
    bindings.push({ morph, readIcon });
  }

  for (const button of document.querySelectorAll("[data-menu-toggle]")) {
    bind(button, button.querySelector(".floating-menu__mark"), "aria-expanded",
      () => button.getAttribute("aria-expanded") === "true" ? iconPaths.close : iconPaths.menu,
      true);
  }
  for (const button of document.querySelectorAll("[data-theme-toggle]")) {
    bind(button, button.querySelector(".theme-toggle__mark"), "data-current-theme",
      () => (button.dataset.currentTheme ?? document.documentElement.dataset.theme) === "dark"
        ? iconPaths.sun : iconPaths.moon);
  }

  // A changed system preference also stops a transition already in flight.
  const settle = () => bindings.forEach(({ morph, readIcon }) => morph.set(readIcon()));
  reducedMotion.addEventListener("change", settle);
  document.addEventListener("visibilitychange", settle);
  window.addEventListener("pagehide", settle);
}

if (typeof document !== "undefined") initInterfaceMotion();
