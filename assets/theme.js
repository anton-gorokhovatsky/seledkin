export const themeStorageKey = "seledkin-theme";

export function normalizeTheme(value) {
  return value === "light" || value === "dark" ? value : null;
}

export function effectiveTheme(explicitTheme, systemPrefersDark) {
  return normalizeTheme(explicitTheme) ?? (systemPrefersDark ? "dark" : "light");
}

function initTheme() {
  const root = document.documentElement;
  const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
  const toggles = [...document.querySelectorAll("[data-theme-toggle]")];
  const themeLogos = [...document.querySelectorAll("[data-theme-logo]")];
  const themeColor = document.querySelector('meta[name="theme-color"]');

  function currentTheme() {
    return effectiveTheme(root.dataset.theme, colorScheme.matches);
  }

  function renderThemeControls() {
    const theme = currentTheme();
    const isDark = theme === "dark";
    const action = isDark ? "Дневная вахта" : "Ночная вахта";
    const accessibleAction = isDark
      ? "Включить дневную вахту"
      : "Включить ночную вахту";

    root.style.colorScheme = theme;
    if (themeColor) themeColor.content = isDark ? "#0e202b" : "#ffffff";

    for (const logo of themeLogos) {
      const source = isDark ? logo.dataset.logoDark : logo.dataset.logoLight;
      if (source && logo.getAttribute("src") !== source) {
        logo.setAttribute("src", source);
      }
    }

    for (const toggle of toggles) {
      toggle.dataset.currentTheme = theme;
      toggle.setAttribute("aria-label", accessibleAction);
      const label = toggle.querySelector("[data-theme-label]");
      if (label) label.textContent = action;
    }
  }

  function setExplicitTheme(theme) {
    root.dataset.theme = theme;
    try {
      localStorage.setItem(themeStorageKey, theme);
    } catch {
      // The selected theme still applies for this page when storage is blocked.
    }
    renderThemeControls();
  }

  for (const toggle of toggles) {
    toggle.addEventListener("click", () => {
      setExplicitTheme(currentTheme() === "dark" ? "light" : "dark");
    });
  }

  colorScheme.addEventListener?.("change", () => {
    if (!normalizeTheme(root.dataset.theme)) renderThemeControls();
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== themeStorageKey) return;
    const theme = normalizeTheme(event.newValue);
    if (theme) {
      root.dataset.theme = theme;
    } else {
      delete root.dataset.theme;
    }
    renderThemeControls();
  });

  renderThemeControls();
}

if (typeof document !== "undefined") {
  initTheme();
}
