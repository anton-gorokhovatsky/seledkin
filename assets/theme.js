import { store } from "./store-data.js?v=sea-hours-1";
import { storeClock } from "./store-time.js?v=sea-hours-1";

export const themeStorageKey = "seledkin-theme";
export const storeTimeZone = store.timeZone;
export const storeOpenHour = Number(store.hours.open.slice(0, 2));
export const storeCloseHour = Number(store.hours.close.slice(0, 2));
const timeMs = time => (Number(time.slice(0, 2)) * 60 + Number(time.slice(3))) * 60_000;

export function normalizeTheme(value) {
  return value === "light" || value === "dark" ? value : null;
}

// The automatic watch follows regular hours; holiday status and manual theme are independent.
export function scheduledTheme(date = new Date()) {
  const clock = storeClock(date);
  if (!clock) return null;
  return clock.elapsed >= timeMs(store.hours.open) && clock.elapsed < timeMs(store.hours.close)
    ? "light" : "dark";
}

export function millisecondsUntilThemeShift(date = new Date()) {
  const clock = storeClock(date);
  if (!clock) return null;
  const opening = timeMs(store.hours.open);
  const closing = timeMs(store.hours.close);
  const next = clock.elapsed < opening ? opening : clock.elapsed < closing ? closing : 86_400_000 + opening;
  return Math.max(50, next - clock.elapsed + 50);
}

export function effectiveTheme(
  explicitTheme,
  systemPrefersDark,
  scheduleTheme = null,
) {
  return (
    normalizeTheme(explicitTheme) ??
    normalizeTheme(scheduleTheme) ??
    (systemPrefersDark ? "dark" : "light")
  );
}

function initTheme() {
  const root = document.documentElement;
  const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
  const toggles = [...document.querySelectorAll("[data-theme-toggle]")];
  const themeLogos = [...document.querySelectorAll("[data-theme-logo]")];
  const themeVideos = [...document.querySelectorAll("[data-theme-video]")];
  const themeColor = document.querySelector('meta[name="theme-color"]');
  let explicitTheme =
    root.dataset.themeSource === "explicit"
      ? normalizeTheme(root.dataset.theme)
      : null;
  let scheduleTimer = null;

  function currentTheme() {
    return effectiveTheme(
      explicitTheme,
      colorScheme.matches,
      scheduledTheme(new Date()),
    );
  }

  function logoSource(logo, isDark) {
    return isDark ? logo.dataset.logoDark : logo.dataset.logoLight;
  }

  function renderThemeMedia(isDark) {
    for (const video of themeVideos) {
      if (!(video instanceof HTMLVideoElement)) continue;

      const nextPoster = isDark ? video.dataset.posterDark : video.dataset.posterLight;
      if (nextPoster && video.getAttribute("poster") !== nextPoster) {
        video.setAttribute("poster", nextPoster);
      }
      // Source loading belongs to sea-motion, where traffic and motion preferences are known.
    }
  }

  function renderThemeControls() {
    const theme = currentTheme();
    const isDark = theme === "dark";
    const action = isDark ? "Дневная вахта" : "Ночная вахта";
    const accessibleAction = isDark
      ? "Включить дневную вахту"
      : "Включить ночную вахту";

    root.dataset.theme = theme;
    if (explicitTheme) {
      root.dataset.themeSource = "explicit";
    } else {
      delete root.dataset.themeSource;
    }
    root.style.colorScheme = theme;
    if (themeColor) themeColor.content = isDark ? "#0e202b" : "#ffffff";

    for (const logo of themeLogos) {
      const source = logoSource(logo, isDark);
      if (source && logo.getAttribute("src") !== source) {
        logo.setAttribute("src", source);
      }
    }

    renderThemeMedia(isDark);

    for (const toggle of toggles) {
      toggle.dataset.currentTheme = theme;
      toggle.setAttribute("aria-label", accessibleAction);
      const label = toggle.querySelector("[data-theme-label]");
      if (label) label.textContent = action;
    }

    document.dispatchEvent(
      new CustomEvent("seledkin:themechange", { detail: { theme } }),
    );
  }

  function scheduleNextShift() {
    if (scheduleTimer) window.clearTimeout(scheduleTimer);
    scheduleTimer = null;
    if (explicitTheme) return;

    const delay = millisecondsUntilThemeShift(new Date());
    if (!Number.isFinite(delay)) return;
    scheduleTimer = window.setTimeout(() => {
      renderThemeControls();
      scheduleNextShift();
    }, delay);
  }

  function setExplicitTheme(theme) {
    explicitTheme = normalizeTheme(theme);
    try {
      localStorage.setItem(themeStorageKey, explicitTheme);
    } catch {
      // The selected theme still applies for this page when storage is blocked.
    }
    renderThemeControls();
    scheduleNextShift();
  }

  for (const toggle of toggles) {
    toggle.addEventListener("click", () => {
      setExplicitTheme(currentTheme() === "dark" ? "light" : "dark");
    });
  }

  colorScheme.addEventListener?.("change", () => {
    if (!explicitTheme && !scheduledTheme(new Date())) renderThemeControls();
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== themeStorageKey) return;
    explicitTheme = normalizeTheme(event.newValue);
    renderThemeControls();
    scheduleNextShift();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden || explicitTheme) return;
    renderThemeControls();
    scheduleNextShift();
  });

  renderThemeControls();
  scheduleNextShift();
}

if (typeof document !== "undefined") {
  initTheme();
}
