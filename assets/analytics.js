// Goal IDs are configured in counter 70820554. A transition is not a purchase.
// Never include search text, draft messages, URLs or contact details in params.
const goals = new Set(["catalog_search", "catalog_search_empty", "product_select", "order_click", "map_open"]);
export function reachGoal(goal, params = {}) {
  if (!goals.has(goal) || !["ks.fish", "www.ks.fish"].includes(location.hostname)) return;
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
