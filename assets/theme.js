export const themeStorageKey = "seledkin-theme";
export const storeTimeZone = "Europe/Moscow";
export const storeOpenHour = 11;
export const storeCloseHour = 20;

let moscowClockFormatter = null;

export function normalizeTheme(value) {
  return value === "light" || value === "dark" ? value : null;
}

function moscowClock(date) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;

  try {
    moscowClockFormatter ??= new Intl.DateTimeFormat("en-GB", {
      timeZone: storeTimeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    const values = Object.fromEntries(
      moscowClockFormatter
        .formatToParts(date)
        .filter(({ type }) => type !== "literal")
        .map(({ type, value }) => [type, Number(value)]),
    );
    if (![values.hour, values.minute, values.second].every(Number.isFinite)) {
      return null;
    }
    return {
      hour: values.hour % 24,
      minute: values.minute,
      second: values.second,
    };
  } catch {
    return null;
  }
}

export function scheduledTheme(date = new Date()) {
  const clock = moscowClock(date);
  if (!clock) return null;
  return clock.hour >= storeOpenHour && clock.hour < storeCloseHour
    ? "light"
    : "dark";
}

export function millisecondsUntilThemeShift(date = new Date()) {
  const clock = moscowClock(date);
  if (!clock) return null;

  const elapsed =
    ((clock.hour * 60 + clock.minute) * 60 + clock.second) * 1000 +
    date.getMilliseconds();
  const opening = storeOpenHour * 60 * 60 * 1000;
  const closing = storeCloseHour * 60 * 60 * 1000;
  const day = 24 * 60 * 60 * 1000;
  const nextBoundary =
    elapsed < opening
      ? opening
      : elapsed < closing
        ? closing
        : day + opening;

  return Math.max(50, nextBoundary - elapsed + 50);
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

      const source = video.querySelector("[data-theme-video-source]");
      const nextPoster = isDark
        ? video.dataset.posterDark
        : video.dataset.posterLight;
      const nextSource = isDark
        ? source?.dataset.srcDark
        : source?.dataset.srcLight;
      let sourceChanged = false;

      if (nextPoster && video.getAttribute("poster") !== nextPoster) {
        video.setAttribute("poster", nextPoster);
      }
      if (source && nextSource && source.getAttribute("src") !== nextSource) {
        source.setAttribute("src", nextSource);
        sourceChanged = true;
      }
      if (sourceChanged) {
        video.classList.remove("is-ready");
        video.load();
      }
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
