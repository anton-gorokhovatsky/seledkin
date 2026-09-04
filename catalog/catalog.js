import { matchesSearch, positionCount } from "../assets/catalog-model.js";

const search = document.querySelector("[data-catalog-search]");
const filters = document.querySelector("[data-catalog-filters]");
const select = document.querySelector("[data-catalog-select]");
const list = document.querySelector("[data-catalog-list]");
const count = document.querySelector("[data-catalog-count]");
const reset = document.querySelector("[data-catalog-reset]");
const controls = document.querySelector("[data-catalog-controls]");
const empty = document.querySelector("[data-catalog-empty]");
const categories = [...list.querySelectorAll(".catalog-category")].map((section) => ({
  section,
  slug: section.dataset.category,
  count: section.querySelector(".catalog-category-count"),
  products: [...section.querySelectorAll(".catalog-product")],
}));
let activeCategory = "all";
let query = "";

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
  for (const category of categories) {
    let categoryCount = 0;
    for (const product of category.products) {
      product.hidden = (activeCategory !== "all" && activeCategory !== category.slug)
        || !matchesSearch(product.dataset.searchText, query);
      if (!product.hidden) categoryCount += 1;
    }
    category.section.hidden = categoryCount === 0;
    category.count.textContent = positionCount(categoryCount);
    visibleCount += categoryCount;
  }
  count.textContent = visibleCount ? positionCount(visibleCount) : "Ничего не найдено";
  empty.hidden = visibleCount > 0;
  reset.hidden = activeCategory === "all" && query === "";
  filters.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.category === activeCategory));
  });
  select.value = activeCategory;
}

filters.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  writeUrl();
  render();
});
search.addEventListener("input", () => {
  query = search.value;
  writeUrl(true);
  render();
});
select.addEventListener("change", () => {
  activeCategory = select.value;
  writeUrl();
  render();
});
reset.addEventListener("click", () => {
  activeCategory = "all";
  query = "";
  search.value = "";
  writeUrl();
  render();
  search.focus();
});
function restore() {
  readUrl();
  render();
}
window.addEventListener("popstate", restore);
window.addEventListener("hashchange", restore);
restore();
controls.hidden = false;
