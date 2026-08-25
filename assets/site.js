import "./typography.js";
import "./theme.js";

const menuButton = document.querySelector("[data-menu-toggle]");
const menu = document.querySelector("[data-menu]");
const menuPanel = menu?.querySelector(".site-menu__panel");
const menuClose = document.querySelector("[data-menu-close]");

function focusableMenuItems() {
  if (!menu) return [];

  return [
    ...menu.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ];
}

function setPageInert(value) {
  if (!menu) return;

  for (const element of document.body.children) {
    if (!(element instanceof HTMLElement) || element === menu) continue;
    if (element.tagName === "SCRIPT") continue;
    element.inert = value;
  }
}

function openMenu() {
  if (!menuButton || !menu) return;

  menu.hidden = false;
  if (menuPanel instanceof HTMLElement) menuPanel.scrollTop = 0;
  menuButton.setAttribute("aria-expanded", "true");
  menuButton.setAttribute("aria-label", "Закрыть меню");
  document.body.classList.add("menu-open");
  menuClose?.focus();
  setPageInert(true);
}

function closeMenu({ returnFocus = false } = {}) {
  if (!menuButton || !menu) return;

  setPageInert(false);
  menu.hidden = true;
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Открыть меню");
  document.body.classList.remove("menu-open");

  if (returnFocus) {
    menuButton.focus();
  }
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
