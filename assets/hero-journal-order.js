import { copyOrderMessage } from "./order-message.js";

export function setupHeroJournalOrders(journal) {
  const desktop = matchMedia("(min-width: 61.1876rem)");
  const copyBeforeTelegram = matchMedia("(hover: hover) and (pointer: fine)");
  const products = [...journal.querySelectorAll("[data-hero-journal-product]")];
  const controls = products.map(product => {
    const button = product.querySelector("button[popovertarget]");
    const panel = product.querySelector("[popover]");
    const telegram = panel.querySelector("[data-hero-order-telegram]");
    const manualCopy = panel.querySelector("label");
    const field = manualCopy.querySelector("textarea");
    const status = panel.querySelector("[role=status]");
    let copying = false;
    const reset = () => {
      manualCopy.hidden = true;
      field.value = "";
      status.textContent = "";
      telegram.querySelector("span").textContent = copyBeforeTelegram.matches
        ? "Скопировать и\u00a0открыть Телеграм" : "В\u00a0Телеграме";
    };
    const position = () => {
      if (!panel.matches(":popover-open")) return;
      const anchor = button.getBoundingClientRect();
      if (!desktop.matches || anchor.bottom < 0 || anchor.top > innerHeight) {
        panel.hidePopover();
        return;
      }
      panel.style.maxWidth = `${Math.min(Math.max(product.clientWidth, 400), innerWidth - 32)}px`;
      const bounds = panel.getBoundingClientRect();
      panel.style.left = `${Math.max(16, Math.min(anchor.left, innerWidth - bounds.width - 16))}px`;
      const below = anchor.bottom + 12;
      panel.style.top = `${below + bounds.height <= innerHeight - 16
        ? below : Math.max(16, anchor.top - bounds.height - 12)}px`;
    };
    panel.addEventListener("beforetoggle", event => {
      button.setAttribute("aria-expanded", String(event.newState === "open"));
    });
    panel.addEventListener("toggle", event => {
      if (event.newState !== "open") return;
      position();
      if (document.documentElement.dataset.inputModality === "keyboard") telegram.focus({ preventScroll: true });
    });
    telegram.addEventListener("click", async event => {
      if (!copyBeforeTelegram.matches || !manualCopy.hidden) return;
      event.preventDefault();
      if (copying) return;
      copying = true;
      const destination = telegram.href;
      const copied = await copyOrderMessage(new URL(destination).searchParams.get("text"), { manualCopy, field, status });
      copying = false;
      // A pending clipboard result must not resurrect the previous slide.
      if (product.hidden) { reset(); return; }
      position();
      if (!copied) {
        telegram.querySelector("span").textContent = "Открыть чат в\u00a0Телеграме";
        return;
      }
      document.dispatchEvent(new CustomEvent("shop:goal", { detail: { goal: "order_click", params: {
        channel: "telegram", context: "journal", entry: product.dataset.heroJournalProduct,
      } } }));
      window.location.assign(destination);
    });
    reset();
    return { product, panel, position, reset };
  });
  addEventListener("resize", () => controls.forEach(control => control.position()));
  addEventListener("scroll", () => controls.forEach(control => control.position()), { passive: true });
  return entryId => {
    for (const { product, panel, reset } of controls) {
      const active = product.dataset.heroJournalProduct === entryId;
      if (!active) {
        if (panel.matches(":popover-open")) panel.hidePopover();
        reset();
      }
      product.hidden = !active;
      product.inert = !active;
      product.setAttribute("aria-hidden", String(!active));
    }
  };
}
