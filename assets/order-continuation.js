import { catalog } from "./catalog-data.js";
import { sharedOrderStore } from "./order-store.js";
import { positionCount } from "./catalog-model.js";

// Product-specific drafts keep their own destination. General order buttons
// return a saved selection to the review/copy step before leaving the site.
export function setupOrderContinuation() {
  const root = new URL("../", import.meta.url);
  const products = new Map(catalog.flatMap(category => category.items.map(product => [product.id, product])));
  const store = sharedOrderStore(products, catalog);
  const links = [...document.querySelectorAll('a.source-button[href="https://t.me/+79166751452"], a.source-button[href="https://wa.me/79166751452"]')]
    .filter(link => !link.closest("#order-list"))
    .map(link => ({ link, label: link.querySelector(".source-button__label") ?? link,
      original: link.getAttribute("href"), text: (link.querySelector(".source-button__label") ?? link).textContent,
      aria: link.getAttribute("aria-label"), channel: link.href.includes("wa.me") ? "whatsapp" : "telegram" }));
  function update() {
    const count = store.read().selected.size;
    for (const item of links) {
      if (count) {
        const destination = new URL("catalog/", root);
        destination.searchParams.set("channel", item.channel);
        destination.hash = "order-list";
        item.link.href = destination.href;
        item.label.textContent = `Продолжить в\u00a0${item.channel === "telegram" ? "Телеграме" : "WhatsApp"} · ${count}`;
        item.link.setAttribute("aria-label", `Продолжить заказ в ${item.channel === "telegram" ? "Телеграме" : "WhatsApp"} · ${positionCount(count)}`);
      } else {
        item.link.href = item.original;
        item.label.textContent = item.text;
        if (item.aria === null) item.link.removeAttribute("aria-label");
        else item.link.setAttribute("aria-label", item.aria);
      }
    }
  }
  window.addEventListener("storage", event => { if (store.isStorageEvent(event)) update(); });
  window.addEventListener("pageshow", update);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) update(); });
  document.addEventListener("shop:order-change", update);
  update();
}
