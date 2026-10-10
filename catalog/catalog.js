import { matchesSearch, positionCount } from "../assets/catalog-model.js";
import { typographText } from "../assets/typography.js";
import { createSearchTracker } from "../assets/catalog-analytics.js";
import { setupOrderList } from "../assets/order-list.js";

const search = document.querySelector("[data-catalog-search]");
const filters = document.querySelector("[data-catalog-filters]");
const select = document.querySelector("[data-catalog-select]");
const selectedLabel = document.querySelector("[data-catalog-selected-label]");
const list = document.querySelector("[data-catalog-list]");
const count = document.querySelector("[data-catalog-count]");
const reset = document.querySelector("[data-catalog-reset]");
const controls = document.querySelector("[data-catalog-controls]");
const closeAdvicePreview = setupAdvicePreviews();
const empty = document.querySelector("[data-catalog-empty]");
const emptyMessage = empty.querySelector("[data-catalog-empty-message]");
const emptyHint = empty.querySelector("[data-catalog-empty-hint]");
const allCategories = empty.querySelector("[data-catalog-all-categories]");
const orderList = setupOrderList();
const journal = document.querySelector("[data-catalog-journal]");
const journalEntries = [...journal.querySelectorAll("[data-journal-result]")];
const categories = [...list.querySelectorAll(".catalog-category")].map((section) => ({
  section,
  slug: section.dataset.category,
  count: section.querySelector(".catalog-category-count"),
  products: [...section.querySelectorAll(".catalog-product")],
}));
let activeCategory = "all";
let query = "";
let activeProduct = "";
let results = { products: 0, journal: 0, totalProducts: 0 };
const searchTracker = createSearchTracker((goal, params) => {
  document.dispatchEvent(new CustomEvent("shop:goal", { detail: { goal, params } }));
});

function reportSearch(trigger) {
  searchTracker.track({ query, category: activeCategory, ...results }, trigger);
}

function readUrl() {
  const url = new URL(location.href);
  const category = url.searchParams.get("category") ?? url.hash.replace(/^#category-/, "");
  activeCategory = categories.some(({ slug }) => slug === category) ? category : "all";
  query = url.searchParams.get("q")?.trim() ?? "";
  activeProduct = url.searchParams.get("product") ?? "";
  const categoryOfProduct = categories.find(category => category.products.some(product => product.dataset.productId === activeProduct));
  if (categoryOfProduct) {
    activeCategory = categoryOfProduct.slug;
    query = categoryOfProduct.products.find(product => product.dataset.productId === activeProduct).dataset.productName;
  } else activeProduct = "";
  search.value = query;
}

function writeUrl(replace = false) {
  const url = new URL(location.href);
  activeProduct = "";
  url.searchParams.delete("product");
  query.trim() ? url.searchParams.set("q", query.trim()) : url.searchParams.delete("q");
  activeCategory === "all" ? url.searchParams.delete("category") : url.searchParams.set("category", activeCategory);
  if (/^#(?:category|product)-/.test(url.hash)) url.hash = "";
  if (url.href !== location.href) {
    history[replace ? "replaceState" : "pushState"](null, "", url);
  }
}

function render() {
  closeAdvicePreview();
  let visibleCount = 0;
  let totalProducts = 0;
  for (const category of categories) {
    let categoryCount = 0;
    for (const product of category.products) {
      const matches = activeProduct ? product.dataset.productId === activeProduct : matchesSearch(product.dataset.searchText, query);
      if (matches) totalProducts += 1;
      product.hidden = (activeCategory !== "all" && activeCategory !== category.slug) || !matches;
      if (!product.hidden) categoryCount += 1;
    }
    category.section.hidden = categoryCount === 0;
    category.count.textContent = positionCount(categoryCount);
    visibleCount += categoryCount;
  }
  let journalCount = 0;
  for (const entry of journalEntries) {
    entry.hidden = !query.trim() || !matchesSearch(entry.dataset.searchText, query);
    if (!entry.hidden) journalCount += 1;
  }
  journal.hidden = journalCount === 0;
  results = { products: visibleCount, journal: journalCount, totalProducts };
  select.value = activeCategory;
  selectedLabel.textContent = select.selectedOptions[0].textContent;
  const categoryRestricted = activeCategory !== "all";
  const noMatches = categoryRestricted
    ? `В категории «${selectedLabel.textContent}» совпадений нет`
    : "В каталоге нет совпадений";
  count.textContent = typographText(`${!visibleCount && journalCount ? "В каталоге нет совпадений" : positionCount(visibleCount)}${journalCount ? ` · Из журнала: ${journalCount}` : ""}`);
  empty.hidden = visibleCount > 0 || (journalCount > 0 && !categoryRestricted);
  emptyMessage.textContent = typographText(`${noMatches}.`);
  emptyHint.textContent = typographText(categoryRestricted
    ? "Попробуйте поиск во всех категориях или измените запрос."
    : "Попробуйте другое название или спросите у лавки.");
  allCategories.hidden = !categoryRestricted;
  orderList.setSearchState({ needsHelp: visibleCount === 0 });
  reset.hidden = activeCategory === "all" && query === "";
  reset.textContent = activeProduct ? "Весь каталог" : "Сбросить поиск";
  filters.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.category === activeCategory));
  });
}

filters.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  writeUrl();
  render();
  reportSearch("category");
});
search.addEventListener("input", () => {
  query = search.value;
  if (!query.trim()) searchTracker.reset();
  writeUrl(true);
  render();
});
search.addEventListener("blur", () => reportSearch("blur"));
search.addEventListener("keydown", event => {
  if (event.key === "Enter") reportSearch("enter");
});
select.addEventListener("change", () => {
  activeCategory = select.value;
  writeUrl();
  render();
  reportSearch("category");
});
reset.addEventListener("click", () => {
  activeCategory = "all";
  query = "";
  search.value = "";
  searchTracker.reset();
  writeUrl();
  render();
  search.focus();
});
allCategories.addEventListener("click", () => {
  activeCategory = "all";
  writeUrl();
  render();
  reportSearch("broaden");
  search.focus();
});
function restore() {
  readUrl();
  render();
  const targetId = activeProduct;
  if (targetId) requestAnimationFrame(() => {
    const product = document.getElementById(`product-${targetId}`);
    if (!product || product.hidden || targetId !== activeProduct) return;
    product.scrollIntoView({ block: "start" });
    product.focus({ preventScroll: true });
  });
}
window.addEventListener("popstate", restore);
window.addEventListener("hashchange", restore);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && document.activeElement === search) reportSearch("leave");
});
function setupAdvicePreviews() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return () => {};
  let active = null;
  let closeTimer;
  const close = () => {
    clearTimeout(closeTimer);
    active?.classList.remove("is-previewing");
    active = null;
  };
  const place = link => {
    const panel = link.querySelector(".catalog-advice-photo");
    const anchor = link.getBoundingClientRect();
    const photo = panel.getBoundingClientRect();
    const product = link.closest(".catalog-product").getBoundingClientRect();
    const right = product.right + 16;
    const leftOfProduct = product.left - photo.width - 16;
    const beside = right + photo.width <= innerWidth - 12 || leftOfProduct >= 12;
    const left = beside ? (right + photo.width <= innerWidth - 12 ? right : leftOfProduct)
      : Math.max(12, Math.min(anchor.left, innerWidth - photo.width - 12));
    const top = beside ? Math.max(12, Math.min(anchor.bottom - photo.height, innerHeight - photo.height - 12))
      : anchor.top >= photo.height + 24 ? anchor.top - photo.height - 12
        : Math.max(12, Math.min(anchor.bottom + 12, innerHeight - photo.height - 12));
    panel.style.setProperty("--preview-left", `${left}px`);
    panel.style.setProperty("--preview-top", `${top}px`);
  };
  for (const link of document.querySelectorAll(".catalog-advice-link")) {
    const show = () => {
      close();
      active = link;
      link.classList.add("is-previewing");
      place(link);
    };
    const leave = () => {
      if (!link.matches(":focus-visible")) closeTimer = setTimeout(close, 350);
    };
    link.addEventListener("pointerenter", show);
    link.addEventListener("pointerleave", leave);
    link.addEventListener("focus", () => { if (link.matches(":focus-visible")) show(); });
    link.addEventListener("blur", close);
    link.querySelector(".catalog-advice-photo").addEventListener("pointerenter", () => clearTimeout(closeTimer));
    link.querySelector(".catalog-advice-photo").addEventListener("pointerleave", leave);
    link.querySelector("img").addEventListener("load", () => { if (active === link) place(link); });
  }
  document.addEventListener("keydown", event => { if (event.key === "Escape" && active) close(); });
  window.addEventListener("scroll", () => {
    if (!active) return;
    const bounds = active.getBoundingClientRect();
    if (bounds.bottom < 0 || bounds.top > innerHeight) close();
    else place(active);
  }, { passive: true });
  window.addEventListener("resize", close);
  return close;
}
restore();
controls.hidden = false;
