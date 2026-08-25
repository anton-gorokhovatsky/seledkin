import "./typography.js";

const menuButton = document.querySelector("[data-menu-toggle]");
const menu = document.querySelector("[data-menu]");
const menuClose = document.querySelector("[data-menu-close]");
const hero = document.querySelector(".source-hero");
const mobileQuery = window.matchMedia("(max-width: 61.1875rem)");

let scrollFrame = 0;

function focusableMenuItems() {
  if (!menu) return [];

  return [
    ...menu.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ];
}

function openMenu() {
  if (!menuButton || !menu) return;

  menu.hidden = false;
  menuButton.setAttribute("aria-expanded", "true");
  menuButton.setAttribute("aria-label", "Закрыть меню");
  document.body.classList.add("menu-open");
  menuClose?.focus();
}

function closeMenu({ returnFocus = false } = {}) {
  if (!menuButton || !menu) return;

  menu.hidden = true;
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Открыть меню");
  document.body.classList.remove("menu-open");

  if (returnFocus) {
    menuButton.focus();
  }
}

function updateFloatingMenu() {
  scrollFrame = 0;
  if (!menuButton) return;

  const isMobile = mobileQuery.matches;
  const revealAt = document.querySelector(".source-header")?.offsetHeight ?? 0;
  const shouldShow = isMobile || !hero || window.scrollY > revealAt;

  menuButton.classList.toggle("is-visible", shouldShow);
  menuButton.classList.toggle(
    "is-past-hero",
    isMobile && Boolean(hero) && window.scrollY > hero.offsetHeight - 96,
  );
}

function requestMenuUpdate() {
  if (scrollFrame) return;
  scrollFrame = window.requestAnimationFrame(updateFloatingMenu);
}

if (menuButton && menu) {
  menuButton.addEventListener("click", () => {
    if (menuButton.getAttribute("aria-expanded") === "true") {
      closeMenu({ returnFocus: true });
    } else {
      openMenu();
    }
  });

  menuClose?.addEventListener("click", () => {
    closeMenu({ returnFocus: true });
  });

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

window.addEventListener("scroll", requestMenuUpdate, { passive: true });
window.addEventListener("resize", requestMenuUpdate, { passive: true });
mobileQuery.addEventListener("change", requestMenuUpdate);

updateFloatingMenu();
