import { matchesSearch, positionCount } from "../assets/catalog-model.js?v=buyer-paths-1";
import { typographText } from "../assets/typography.js?v=typography-23-1";
import { createSearchTracker } from "../assets/catalog-analytics.js?v=analytics-2";

const search = document.querySelector("[data-catalog-search]");
const filters = document.querySelector("[data-catalog-filters]");
const select = document.querySelector("[data-catalog-select]");
const selectedLabel = document.querySelector("[data-catalog-selected-label]");
const list = document.querySelector("[data-catalog-list]");
const count = document.querySelector("[data-catalog-count]");
const reset = document.querySelector("[data-catalog-reset]");
const controls = document.querySelector("[data-catalog-controls]");
const empty = document.querySelector("[data-catalog-empty]");
const emptyMessage = empty.querySelector("[data-catalog-empty-message]");
const emptyHint = empty.querySelector("[data-catalog-empty-hint]");
const allCategories = empty.querySelector("[data-catalog-all-categories]");
const orderTitle = document.querySelector("[data-catalog-order-title]");
const orderCopy = document.querySelector("[data-catalog-order-copy]");
const orderLabels = [...document.querySelectorAll("[data-catalog-order-channel]")];
const defaultOrder = { title: orderTitle.textContent, copy: orderCopy.textContent };
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
  search.value = query;
}

function writeUrl(replace = false) {
  const url = new URL(location.href);
  query.trim() ? url.searchParams.set("q", query.trim()) : url.searchParams.delete("q");
  activeCategory === "all" ? url.searchParams.delete("category") : url.searchParams.set("category", activeCategory);
  if (url.hash.startsWith("#category-")) url.hash = "";
  if (url.href !== location.href) {
    history[replace ? "replaceState" : "pushState"](null, "", url);
  }
}

function render() {
  let visibleCount = 0;
  let totalProducts = 0;
  for (const category of categories) {
    let categoryCount = 0;
    for (const product of category.products) {
      const matches = matchesSearch(product.dataset.searchText, query);
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
  const needsHelp = visibleCount === 0;
  orderTitle.textContent = needsHelp ? "Помочь с выбором?" : defaultOrder.title;
  orderCopy.textContent = needsHelp
    ? "Напишите, что ищете: уточним наличие и подскажем подходящие продукты."
    : defaultOrder.copy;
  for (const label of orderLabels) label.textContent = `${needsHelp ? "Спросить" : "Заказать"} в ${label.dataset.catalogOrderChannel}`;
  reset.hidden = activeCategory === "all" && query === "";
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
}
window.addEventListener("popstate", restore);
window.addEventListener("hashchange", restore);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && document.activeElement === search) reportSearch("leave");
});
restore();
controls.hidden = false;
