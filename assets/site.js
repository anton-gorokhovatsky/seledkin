const root = document.documentElement;
const themeQuery = window.matchMedia("(prefers-color-scheme: dark)");
const themeButtons = document.querySelectorAll("[data-theme-toggle]");

function storedTheme() {
  try {
    const value = window.localStorage.getItem("seledkin-theme");
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function effectiveTheme() {
  return root.dataset.theme ?? (themeQuery.matches ? "dark" : "light");
}

function syncThemeButtons() {
  const isDark = effectiveTheme() === "dark";

  themeButtons.forEach((button) => {
    button.textContent = isDark ? "Дневная смена" : "Ночная смена";
    button.setAttribute(
      "aria-label",
      isDark
        ? "Дневная смена — включить светлую тему"
        : "Ночная смена — включить тёмную тему",
    );
  });
}

function setTheme(theme) {
  root.dataset.theme = theme;

  try {
    window.localStorage.setItem("seledkin-theme", theme);
  } catch {}

  syncThemeButtons();
}

themeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setTheme(effectiveTheme() === "dark" ? "light" : "dark");
  });
});

themeQuery.addEventListener("change", () => {
  if (!storedTheme()) {
    delete root.dataset.theme;
    syncThemeButtons();
  }
});

window.addEventListener("storage", (event) => {
  if (event.key !== "seledkin-theme") return;

  if (event.newValue === "light" || event.newValue === "dark") {
    root.dataset.theme = event.newValue;
  } else {
    delete root.dataset.theme;
  }

  syncThemeButtons();
});

syncThemeButtons();

const menuButton = document.querySelector("[data-menu-toggle]");
const menu = document.querySelector("[data-menu]");

if (menuButton && menu) {
  const closeMenu = () => {
    menuButton.setAttribute("aria-expanded", "false");
    menu.classList.remove("is-open");
  };

  menuButton.addEventListener("click", () => {
    const willOpen = menuButton.getAttribute("aria-expanded") !== "true";
    menuButton.setAttribute("aria-expanded", String(willOpen));
    menu.classList.toggle("is-open", willOpen);
  });

  menu.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.classList.contains("is-open")) {
      closeMenu();
      menuButton.focus();
    }
  });

  window.matchMedia("(min-width: 60.001rem)").addEventListener("change", closeMenu);
}
