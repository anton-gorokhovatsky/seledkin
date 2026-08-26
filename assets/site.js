import "./typography.js";
import "./theme.js";

const menuButton = document.querySelector("[data-menu-toggle]");
const menuButtonLabel = menuButton?.querySelector(".floating-menu__label");
const menu = document.querySelector("[data-menu]");
const menuPanel = menu?.querySelector(".site-menu__panel");
const heroVideo = document.querySelector("[data-hero-video]");
const menuSeaVideo = menu?.querySelector("[data-menu-sea-video]");
const map = document.querySelector("[data-map]");
const mapToggle = map?.querySelector("[data-map-toggle]");
const mapToggleLabel = mapToggle?.querySelector("[data-map-toggle-label]");
const mapFrame = map?.querySelector("iframe");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const heroJournal = document.querySelector("[data-hero-journal]");
const heroJournalStack = heroJournal?.querySelector("[data-hero-journal-stack]");
const heroJournalCards = [
  ...(heroJournal?.querySelectorAll("[data-hero-journal-card]") ?? []),
];
const heroJournalPrevious = heroJournal?.querySelector("[data-hero-journal-previous]");
const heroJournalNext = heroJournal?.querySelector("[data-hero-journal-next]");
const heroJournalCounter = heroJournal?.querySelector("[data-hero-journal-counter]");
const heroJournalStatus = heroJournal?.querySelector("[data-hero-journal-status]");
const keyboardNavigationKeys = new Set([
  "Tab",
  "Enter",
  " ",
  "Escape",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
]);

document.addEventListener(
  "keydown",
  (event) => {
    if (keyboardNavigationKeys.has(event.key)) {
      document.documentElement.dataset.inputModality = "keyboard";
    }
  },
  true,
);

document.addEventListener(
  "pointerdown",
  () => {
    document.documentElement.dataset.inputModality = "pointer";
  },
  { capture: true, passive: true },
);

function focusableMenuItems() {
  if (!menu) return [];

  return [
    ...(menuButton ? [menuButton] : []),
    ...menu.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ];
}

function setPageInert(value) {
  if (!menu) return;

  for (const element of document.body.children) {
    if (
      !(element instanceof HTMLElement) ||
      element === menu ||
      element === menuButton
    ) {
      continue;
    }
    if (element.tagName === "SCRIPT") continue;
    element.inert = value;
  }
}

function syncMenuSeaVideo() {
  if (!(menuSeaVideo instanceof HTMLVideoElement)) return;

  const menuIsOpen =
    menuButton?.getAttribute("aria-expanded") === "true" && !menu?.hidden;

  if (reducedMotion.matches || !menuIsOpen) {
    menuSeaVideo.pause();
    if (reducedMotion.matches) menuSeaVideo.currentTime = 0;
    return;
  }

  menuSeaVideo.play().catch(() => {});
}

function openMenu() {
  if (!menuButton || !menu) return;

  menu.hidden = false;
  if (menuPanel instanceof HTMLElement) menuPanel.scrollTop = 0;
  menuButton.setAttribute("aria-expanded", "true");
  menuButton.setAttribute("aria-label", "Закрыть меню");
  if (menuButtonLabel) menuButtonLabel.textContent = "Закрыть";
  document.body.classList.add("menu-open");
  setPageInert(true);
  syncMenuSeaVideo();
}

function closeMenu({ returnFocus = false } = {}) {
  if (!menuButton || !menu) return;

  setPageInert(false);
  menu.hidden = true;
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Открыть меню");
  if (menuButtonLabel) menuButtonLabel.textContent = "Меню";
  document.body.classList.remove("menu-open");
  syncMenuSeaVideo();

  if (returnFocus) {
    menuButton.focus();
  }
}

if (menuButton && menu) {
  menuButton.addEventListener("click", () => {
    if (menuButton.getAttribute("aria-expanded") === "true") {
      closeMenu();
    } else {
      openMenu();
    }
  });

  menu.addEventListener("click", (event) => {
    if (event.target === menu) {
      closeMenu();
      return;
    }

    const link = event.target instanceof Element
      ? event.target.closest("a")
      : null;

    if (link) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (menu.hidden) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu({ returnFocus: true });
      return;
    }

    if (event.key !== "Tab") return;

    const items = focusableMenuItems();
    const first = items.at(0);
    const last = items.at(-1);

    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

if (heroVideo instanceof HTMLVideoElement) {
  const syncHeroVideo = () => {
    if (reducedMotion.matches) {
      heroVideo.pause();
      heroVideo.currentTime = 0;
      heroVideo.classList.add("is-ready");
      return;
    }

    heroVideo.play().catch(() => {
      heroVideo.classList.add("is-ready");
    });
  };

  heroVideo.addEventListener("loadeddata", () => {
    heroVideo.classList.add("is-ready");
  });
  if (heroVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    heroVideo.classList.add("is-ready");
  }
  reducedMotion.addEventListener("change", syncHeroVideo);
  syncHeroVideo();
}

if (
  heroJournal instanceof HTMLElement &&
  heroJournalStack instanceof HTMLElement &&
  heroJournalCards.length > 0 &&
  heroJournalPrevious instanceof HTMLButtonElement &&
  heroJournalNext instanceof HTMLButtonElement
) {
  const titles = heroJournalCards.map((card) =>
    (card.querySelector("strong")?.textContent ?? "")
      .replace(/\s+/g, " ")
      .trim(),
  );
  let currentIndex = 0;
  let pointerStart = null;
  let blockNextClick = false;

  const syncJournal = () => {
    heroJournalCards.forEach((card, index) => {
      const active = index === currentIndex;
      card.dataset.stackPosition = String(index - currentIndex);
      card.setAttribute("aria-hidden", String(!active));
      card.tabIndex = active ? 0 : -1;
      card.inert = !active;
    });

    const hasPrevious = currentIndex > 0;
    const hasNext = currentIndex < heroJournalCards.length - 1;
    heroJournalPrevious.setAttribute("aria-disabled", String(!hasPrevious));
    heroJournalNext.setAttribute("aria-disabled", String(!hasNext));

    const position = String(currentIndex + 1) + " из " + String(heroJournalCards.length);
    if (heroJournalCounter) heroJournalCounter.textContent = position;
    if (heroJournalStatus) {
      heroJournalStatus.textContent =
        "Запись " + position + ": " + titles[currentIndex];
    }
  };

  const showJournalCard = (index, { focusCard = false } = {}) => {
    const nextIndex = Math.max(
      0,
      Math.min(heroJournalCards.length - 1, index),
    );
    if (nextIndex === currentIndex) return;
    currentIndex = nextIndex;
    syncJournal();
    if (focusCard) {
      requestAnimationFrame(() => heroJournalCards[currentIndex].focus());
    }
  };

  heroJournalPrevious.addEventListener("click", () => {
    if (heroJournalPrevious.getAttribute("aria-disabled") === "true") return;
    showJournalCard(currentIndex - 1);
  });

  heroJournalNext.addEventListener("click", () => {
    if (heroJournalNext.getAttribute("aria-disabled") === "true") return;
    showJournalCard(currentIndex + 1);
  });

  heroJournal.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showJournalCard(currentIndex - 1, { focusCard: true });
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      showJournalCard(currentIndex + 1, { focusCard: true });
    }
  });

  heroJournalStack.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary) return;
    pointerStart = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  });

  heroJournalStack.addEventListener("pointerup", (event) => {
    if (!pointerStart || pointerStart.id !== event.pointerId) return;
    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    pointerStart = null;

    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) {
      return;
    }

    blockNextClick = true;
    event.preventDefault();
    showJournalCard(currentIndex + (deltaX < 0 ? 1 : -1));
    setTimeout(() => {
      blockNextClick = false;
    }, 0);
  });

  heroJournalStack.addEventListener("pointercancel", () => {
    pointerStart = null;
  });

  heroJournalStack.addEventListener(
    "click",
    (event) => {
      if (!blockNextClick) return;
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );

  syncJournal();
}

reducedMotion.addEventListener("change", syncMenuSeaVideo);
syncMenuSeaVideo();

if (
  map instanceof HTMLElement &&
  mapToggle instanceof HTMLButtonElement &&
  mapFrame instanceof HTMLIFrameElement
) {
  const setMapInteractive = (enabled) => {
    map.classList.toggle("is-interactive", enabled);
    mapToggle.setAttribute("aria-pressed", String(enabled));
    mapToggle.setAttribute(
      "aria-label",
      enabled ? "Отключить карту" : "Включить карту",
    );
    mapFrame.tabIndex = enabled ? 0 : -1;
    mapFrame.setAttribute("aria-hidden", String(!enabled));
    if (mapToggleLabel) {
      mapToggleLabel.textContent = enabled
        ? "Отключить карту"
        : "Включить карту";
    }
  };

  mapToggle.addEventListener("click", () => {
    setMapInteractive(mapToggle.getAttribute("aria-pressed") !== "true");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || mapToggle.getAttribute("aria-pressed") !== "true") {
      return;
    }

    event.preventDefault();
    setMapInteractive(false);
    mapToggle.focus();
  });

  setMapInteractive(false);
}
