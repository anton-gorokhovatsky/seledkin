import { analyticsAllowed } from "./analytics-policy.js?v=analytics-2";

// Goal IDs are configured in counter 70820554. A transition is not a purchase.
// Never include search text, draft messages, URLs or contact details in params.
const goals = new Set(["catalog_search", "catalog_search_empty", "catalog_search_recovered", "product_select", "order_click", "map_open"]);
let enabled = false;
if (typeof window !== "undefined") {
  let storage;
  try { storage = sessionStorage; } catch {}
  enabled = analyticsAllowed(new URL(location.href), storage, navigator.webdriver);
  if (enabled) {
    window.ym ??= function () { (window.ym.a ??= []).push(arguments); };
    window.ym.l = Date.now();
    const src = "https://mc.yandex.ru/metrika/tag.js";
    if (![...document.scripts].some(script => script.src === src)) {
      const tag = document.createElement("script");
      tag.async = true;
      tag.src = src;
      document.head.append(tag);
    }
    window.ym(70820554, "init", { webvisor: true, clickmap: true,
      referrer: document.referrer, url: location.href, accurateTrackBounce: true, trackLinks: true });
  }
}
export function reachGoal(goal, params = {}) {
  if (!enabled || !goals.has(goal)) return;
  try { window.ym?.(70820554, "reachGoal", goal, params); } catch { /* Analytics must not interrupt a customer task. */ }
}

if (typeof document !== "undefined") {
  document.addEventListener("shop:goal", event => reachGoal(event.detail.goal, event.detail.params));
  document.addEventListener("click", event => {
    const link = event.target.closest("a[href]");
    if (!link) return;
    const url = new URL(link.href);
    let channel;
    if (url.hostname === "t.me" && url.pathname === "/+79166751452") channel = "telegram";
    if (url.hostname === "wa.me" && url.pathname === "/79166751452") channel = "whatsapp";
    if (url.protocol === "tel:") channel = "phone";
    if (channel) {
      const product = link.closest("[data-product-name]");
      const entry = link.closest("[data-journal-id]");
      reachGoal("order_click", { channel, context: product ? "catalog" : entry ? "journal" : link.closest("[data-menu]") ? "menu" : "page", ...(product ? { product: product.dataset.productName } : {}), ...(entry ? { entry: entry.dataset.journalId } : {}) });
    }
    if (url.hostname === "yandex.ru" && url.pathname.startsWith("/maps")) reachGoal("map_open", { mode: "route" });
  });
  document.addEventListener("toggle", event => {
    if (!event.target.matches(".catalog-product details[open]")) return;
    const product = event.target.closest("[data-product-name]");
    if (product) reachGoal("product_select", { product: product.dataset.productName, category: product.dataset.productCategory });
  }, true);
}
