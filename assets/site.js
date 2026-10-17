import { typographText } from "./typography.js";
import { setupAssortmentPreview } from "./assortment-preview.js";
import { setupMobileHero } from "./mobile-hero.js";
import { setupHeroJournalOrders } from "./hero-journal-order.js";
import "./theme.js";
import "./store-environment.js";
import { syncMenuSeaVideo } from "./sea-motion.js";
import { setupOrderContinuation } from "./order-continuation.js";
import "./footer-coral.js";

const root = new URL("../", import.meta.url);
const isHome = location.pathname === root.pathname || location.pathname === `${root.pathname}index.html`;
setupOrderContinuation();
setupMobileHero();
if (isHome) setupAssortmentPreview();
if (isHome && /^#journal-entry-\d+$/.test(location.hash)) {
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
const menuServiceScroll = menu?.querySelector(".site-menu__service-inner");
const menuVeil = menu ? document.createElement("div") : null;
if (menuVeil) {
  menuVeil.className = "site-menu__veil";
  menuVeil.setAttribute("aria-hidden", "true");
  menu.insertBefore(menuVeil, menuPanel);
}
const inertBeforeMenu = new Map();
let menuIsOpen = false;
let menuAnimations = [];
const map = document.querySelector("[data-map]");
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
  ].filter(element => !element.hidden && element.getClientRects().length > 0
    && (!element.matches('input[type="radio"]') || element.checked));
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

function cancelMenuAnimations() {
  for (const animation of menuAnimations) {
    animation.onfinish = null;
    animation.cancel();
  }
  menuAnimations = [];
}

function finishMenuMotion() {
  cancelMenuAnimations();
  if (!menuIsOpen && menu) menu.hidden = true;
  syncMenuSeaVideo();
}

function revealMenu(open, { instant = false } = {}) {
  const interrupted = menuAnimations.length > 0;
  const opacity = interrupted ? getComputedStyle(menuPanel).opacity : open ? 0 : 1;
  const veilOpacity = interrupted ? getComputedStyle(menuVeil).opacity : open ? 0 : 1;
  const groups = [...menu.querySelectorAll(".site-menu__routes > *, .site-menu__service-inner")]
    .map(element => ({
      element,
      opacity: interrupted ? getComputedStyle(element).opacity : open ? 0 : 1,
      transform: interrupted ? getComputedStyle(element).transform : `translateY(${open ? 12 : 0}px)`,
    }));
  // Sample the current frame before cancelling, so repeated clicks reverse in place.
  cancelMenuAnimations();
  menu.hidden = false;
  if (instant || !menuPanel?.animate) {
    finishMenuMotion();
    return;
  }

  const tokens = getComputedStyle(document.documentElement);
  const duration = parseFloat(tokens.getPropertyValue(open ? "--menu-reveal-duration" : "--menu-dismiss-duration"));
  const easing = tokens.getPropertyValue(open ? "--ease-state" : "--ease-exit").trim();
  const reduced = reducedMotion.matches;
  const animation = menuPanel.animate([{ opacity }, { opacity: open ? 1 : 0 }], {
    duration: reduced ? 60 : duration, easing, fill: "both",
  });
  menuAnimations.push(animation);
  // Let the sea cover the previous page before the menu copy becomes legible.
  // The two texts otherwise compete during a long, transparent crossfade.
  menuAnimations.push(menuVeil.animate([{ opacity: veilOpacity }, { opacity: open ? 1 : 0 }], {
    duration: reduced ? 60 : open ? duration / 2 : duration, easing, fill: "both",
  }));
  if (!reduced) {
    for (const { element, opacity: from, transform } of groups) {
      const delay = open && !interrupted ? duration / (element === menuServiceScroll ? 5 : 7) : 0;
      menuAnimations.push(element.animate([
        { opacity: from, transform },
        { opacity: open ? 1 : 0, transform: `translateY(${open ? 0 : 8}px)` },
      ], { duration: duration - delay, delay, easing, fill: "both" }));
    }
  }
  animation.onfinish = finishMenuMotion;
}

function openMenu() {
  if (!menuButton || !menu || !menuClose || menuIsOpen) return;

  menuIsOpen = true;
  menu.hidden = false;
  menu.inert = false;
  menu.removeAttribute("aria-hidden");
  if (menuPanel instanceof HTMLElement) menuPanel.scrollTop = 0;
  if (menuServiceScroll instanceof HTMLElement) menuServiceScroll.scrollTop = 0;
  menuButton.setAttribute("aria-expanded", "true");
  menuButton.hidden = true;
  menuClose.hidden = false;
  document.body.classList.add("menu-open");
  setPageInert(true);
  menuClose.focus({ preventScroll: true });
  revealMenu(true, { instant: document.documentElement.dataset.inputModality === "keyboard" });
  syncMenuSeaVideo();
}

function closeMenu({ returnFocus = false, instant = false } = {}) {
  if (!menuButton || !menu) return;

  menuIsOpen = false;
  setPageInert(false);
  menu.inert = true;
  menu.setAttribute("aria-hidden", "true");
  menuButton.hidden = false;
  menuClose.hidden = true;
  menuButton.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");

  if (returnFocus) {
    menuButton.focus({ preventScroll: true });
  }
  revealMenu(false, {
    instant: instant || document.documentElement.dataset.inputModality === "keyboard",
  });
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
      closeMenu({ instant: true });
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!menuIsOpen) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu({ returnFocus: true });
      return;
    }

    if (event.key !== "Tab") return;
    if (menuAnimations.length) finishMenuMotion();

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
    if (menuIsOpen && !menu.contains(event.target)) menuClose.focus({ preventScroll: true });
  });

  window.addEventListener("resize", () => { if (menuAnimations.length) finishMenuMotion(); });
  reducedMotion.addEventListener("change", () => { if (menuAnimations.length) finishMenuMotion(); });

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
  const syncProduct = setupHeroJournalOrders(heroJournal);

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
    const activeCard = heroJournalCards[currentIndex];
    syncProduct(activeCard.dataset.entryId);

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
    if (event.target instanceof Element && event.target.closest("input, textarea, [contenteditable]")) return;
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

if (mapFrame instanceof HTMLIFrameElement) {
  const mapRoute = map.closest("#contacts")?.querySelector(".contacts-source__card a");
  window.addEventListener("message", event => {
    if (event.origin !== location.origin || event.source !== mapFrame.contentWindow) return;
    if (event.data?.type === "seledkin:map-escape") mapRoute?.focus();
  });
}
