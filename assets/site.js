import { typographText } from "./typography.js?v=typography-23-1";
import "./theme.js?v=shop-journeys-2";
import { syncMenuSeaVideo } from "./sea-motion.js?v=hero-priority-1";

const root = new URL("../", import.meta.url);
const isHome = location.pathname === root.pathname || location.pathname === `${root.pathname}index.html`;
if (isHome && /^#journal-entry-(?:68\d|69[0-4])$/.test(location.hash)) {
  location.replace(new URL(`journal/${location.hash}`, root).href);
}

const isAbout = location.pathname === new URL("about/", root).pathname
  || location.pathname === new URL("about/index.html", root).pathname;
if (isAbout && location.hash === "#watch-catch") {
  location.replace(new URL("#watch-catch", root).href);
}

const menuButton = document.querySelector("[data-menu-toggle]");
const menu = document.querySelector("[data-menu]");
const menuClose = menu?.querySelector("[data-menu-close]");
const menuPanel = menu?.querySelector(".site-menu__panel");
const inertBeforeMenu = new Map();
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
const heroJournalAll = heroJournal?.querySelector("[data-hero-journal-all]");
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
    ...menu.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter(element => !element.hidden && element.getClientRects().length > 0);
}

function setPageInert(value) {
  if (!menu) return;

  for (const element of document.body.children) {
    if (
      !(element instanceof HTMLElement) ||
      element === menu
    ) {
      continue;
    }
    if (element.tagName === "SCRIPT") continue;
    if (value) {
      inertBeforeMenu.set(element, element.inert);
      element.inert = true;
    } else if (inertBeforeMenu.has(element)) {
      element.inert = inertBeforeMenu.get(element);
    }
  }
  if (!value) inertBeforeMenu.clear();
}

function openMenu() {
  if (!menuButton || !menu || !menuClose) return;

  menu.hidden = false;
  if (menuPanel instanceof HTMLElement) menuPanel.scrollTop = 0;
  menuButton.setAttribute("aria-expanded", "true");
  menuButton.hidden = true;
  document.body.classList.add("menu-open");
  setPageInert(true);
  menuClose.focus({ preventScroll: true });
  syncMenuSeaVideo();
}

function closeMenu({ returnFocus = false } = {}) {
  if (!menuButton || !menu) return;

  setPageInert(false);
  menu.hidden = true;
  menuButton.hidden = false;
  menuButton.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
  syncMenuSeaVideo();

  if (returnFocus) {
    menuButton.focus({ preventScroll: true });
  }
}

if (menuButton && menu && menuClose) {
  menuButton.addEventListener("click", openMenu);
  menuClose.addEventListener("click", () => closeMenu({ returnFocus: true }));

  menu.addEventListener("click", (event) => {
    if (event.target === menu) {
      closeMenu({ returnFocus: true });
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
    if (!items.length) return;
    // WebKit may omit links/buttons from native Tab order depending on the
    // system keyboard-navigation setting. The modal owns a complete local cycle.
    const current = items.indexOf(document.activeElement);
    const next = current < 0 ? 0 : (current + (event.shiftKey ? -1 : 1) + items.length) % items.length;
    event.preventDefault();
    items[next].focus();
  });

  // Keep focus in the active dialog even if a script tries to focus its background.
  document.addEventListener("focusin", (event) => {
    if (!menu.hidden && !menu.contains(event.target)) menuClose.focus({ preventScroll: true });
  });

  // The source navigation also works if this module (or one of its imports) fails.
  // Hide it only after the modal handlers have been installed successfully.
  document.querySelectorAll("[data-menu-fallback], [data-menu-fallback-link]")
    .forEach(element => { element.hidden = true; });
  menuButton.hidden = false;
}

if (
  heroJournal instanceof HTMLElement &&
  heroJournalStack instanceof HTMLElement &&
  heroJournalCards.length > 0 &&
  heroJournalPrevious instanceof HTMLButtonElement &&
  heroJournalNext instanceof HTMLButtonElement &&
  heroJournalAll instanceof HTMLAnchorElement
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
    heroJournal.dataset.ready = "";
    heroJournalPrevious.hidden = false;
    if (heroJournalCounter) heroJournalCounter.closest("p").hidden = false;
    const image = heroJournalCards[currentIndex]?.querySelector("img[data-full-src]");
    if (image) {
      image.srcset = image.dataset.fullSrcset;
      image.src = image.dataset.fullSrc;
      delete image.dataset.fullSrc;
      delete image.dataset.fullSrcset;
    }
    heroJournalCards.forEach((card, index) => {
      const active = index === currentIndex;
      const stackPosition =
        (index - currentIndex + heroJournalCards.length) % heroJournalCards.length;
      card.dataset.stackPosition = String(stackPosition);
      card.setAttribute("aria-hidden", String(!active));
      card.tabIndex = active ? 0 : -1;
      card.inert = !active;
    });

    const hasPrevious = currentIndex > 0;
    const hasNext = currentIndex < heroJournalCards.length - 1;
    heroJournalPrevious.setAttribute("aria-disabled", String(!hasPrevious));
    heroJournalNext.setAttribute("aria-disabled", String(!hasNext));
    heroJournalPrevious.disabled = !hasPrevious;
    heroJournalNext.disabled = !hasNext;
    heroJournalNext.hidden = !hasNext;
    heroJournalAll.hidden = hasNext;

    const position =
      typographText(String(currentIndex + 1) + " из " + String(heroJournalCards.length));
    if (heroJournalCounter) {
      heroJournalCounter.textContent = position;
    }
    if (heroJournalStatus) {
      heroJournalStatus.textContent =
        typographText("Запись " +
        position +
        " выбранных" +
        ": " +
        titles[currentIndex] +
        (hasNext ? "" : ". Последняя выбранная запись. Справа можно открыть весь Судовой журнал."));
    }
  };

  const showJournalCard = (index, { focusCard = false } = {}) => {
    const nextIndex = Math.max(
      0,
      Math.min(heroJournalCards.length - 1, index),
    );
    if (nextIndex === currentIndex) return;
    const focusedControl = document.activeElement;
    currentIndex = nextIndex;
    syncJournal();
    if (!focusCard && focusedControl === heroJournalNext && heroJournalNext.hidden) {
      heroJournalAll.focus({ preventScroll: true });
    } else if (focusCard ||
        (focusedControl === heroJournalAll && heroJournalAll.hidden) ||
        (focusedControl === heroJournalPrevious && heroJournalPrevious.disabled)) {
      heroJournalCards[currentIndex].focus({ preventScroll: true });
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

  heroJournalCards.forEach((card) => {
    card.addEventListener("click", (event) => {
      const targetId = decodeURIComponent(card.hash.slice(1));
      const target = document.getElementById(targetId);
      if (!(target instanceof HTMLElement)) return;

      event.preventDefault();
      history.pushState(null, "", card.hash);
      target.scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: "start",
      });
      target.focus({ preventScroll: true });
    });
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
    if (event.defaultPrevented || event.key !== "Escape" || mapToggle.getAttribute("aria-pressed") !== "true") {
      return;
    }

    event.preventDefault();
    setMapInteractive(false);
    mapToggle.focus();
  });

  setMapInteractive(false);
}
