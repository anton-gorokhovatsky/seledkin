"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const storageKey = "seledkin-theme";
const darkThemeQuery = "(prefers-color-scheme: dark)";
const themeChangeEvent = "seledkin-theme-change";
let runtimeTheme: Theme | null = null;

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

function getSavedTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(storageKey);
    return isTheme(value) ? value : runtimeTheme;
  } catch {
    return runtimeTheme;
  }
}

function getSystemTheme(): Theme {
  return window.matchMedia(darkThemeQuery).matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  runtimeTheme = theme;
  document.documentElement.dataset.theme = theme;

  try {
    window.localStorage.setItem(storageKey, theme);
  } catch {
    // Даже без хранилища тема продолжает работать на текущей странице.
  }

  window.dispatchEvent(new Event(themeChangeEvent));
}

function subscribeToTheme(onStoreChange: () => void) {
  const media = window.matchMedia(darkThemeQuery);
  const syncSystemTheme = () => {
    if (!getSavedTheme()) onStoreChange();
  };
  const syncStoredTheme = (event: StorageEvent) => {
    if (event.key !== storageKey) return;

    runtimeTheme = isTheme(event.newValue) ? event.newValue : null;

    if (runtimeTheme) {
      document.documentElement.dataset.theme = runtimeTheme;
    } else {
      delete document.documentElement.dataset.theme;
    }

    onStoreChange();
  };

  media.addEventListener("change", syncSystemTheme);
  window.addEventListener("storage", syncStoredTheme);
  window.addEventListener(themeChangeEvent, onStoreChange);

  return () => {
    media.removeEventListener("change", syncSystemTheme);
    window.removeEventListener("storage", syncStoredTheme);
    window.removeEventListener(themeChangeEvent, onStoreChange);
  };
}

function getThemeSnapshot(): Theme {
  return getSavedTheme() ?? getSystemTheme();
}

function getServerThemeSnapshot(): Theme {
  return "light";
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  const isDark = theme === "dark";
  const actionLabel = isDark ? "Дневная смена" : "Ночная смена";
  const accessibleLabel = isDark
    ? "Дневная смена — включить светлую тему"
    : "Ночная смена — включить тёмную тему";

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";

    applyTheme(nextTheme);
  };

  return (
    <button
      className={`theme-toggle${className ? ` ${className}` : ""}`}
      type="button"
      aria-label={accessibleLabel}
      onClick={toggleTheme}
    >
      <svg
        className="theme-toggle__icon"
        aria-hidden="true"
        viewBox="0 0 24 24"
      >
        <path
          className="theme-toggle__night"
          d="M3.5 12a8.5 8.5 0 0 0 17 0Z"
        />
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17" />
        <circle className="theme-toggle__rivet" cx="12" cy="1.75" r="0.75" />
        <circle className="theme-toggle__rivet" cx="22.25" cy="12" r="0.75" />
        <circle className="theme-toggle__rivet" cx="12" cy="22.25" r="0.75" />
        <circle className="theme-toggle__rivet" cx="1.75" cy="12" r="0.75" />
      </svg>
      <span className="theme-toggle__label">{actionLabel}</span>
    </button>
  );
}
