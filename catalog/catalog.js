import { catalog } from "../assets/catalog-data.js";
import { typographPrice, typographText } from "../assets/typography.js";

const allCategories = "all";
const search = document.querySelector("[data-catalog-search]");
const filters = document.querySelector("[data-catalog-filters]");
const select = document.querySelector("[data-catalog-select]");
const list = document.querySelector("[data-catalog-list]");
const count = document.querySelector("[data-catalog-count]");
const reset = document.querySelector("[data-catalog-reset]");
const queryFromUrl =
  new URLSearchParams(window.location.search).get("q")?.trim() ?? "";

const categoryFromHash = window.location.hash.startsWith("#category-")
  ? window.location.hash.replace("#category-", "")
  : null;

let activeCategory = catalog.some((category) => category.slug === categoryFromHash)
  ? categoryFromHash
  : allCategories;
let query = queryFromUrl;
let initialHashHandled = false;

function normalize(value) {
  return value
    .toLocaleLowerCase("ru-RU")
    .replaceAll("ё", "е")
    .replaceAll("\u00a0", " ")
    .replaceAll("\u202f", " ")
    .trim();
}

function syncLogoVariant() {
  const root = document.documentElement;
  const nextVariant = normalize(query).includes("кальмар") ? "squid" : "";
  const currentVariant = root.dataset.logoVariant ?? "";
  if (currentVariant === nextVariant) return;

  if (nextVariant) {
    root.dataset.logoVariant = nextVariant;
  } else {
    delete root.dataset.logoVariant;
  }
  document.dispatchEvent(
    new CustomEvent("seledkin:logovariantchange", {
      detail: { variant: nextVariant || null },
    }),
  );
}

function positionCount(value) {
  const lastTwo = value % 100;
  const last = value % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return `${value} позиций`;
  if (last === 1) return `${value} позиция`;
  if (last >= 2 && last <= 4) return `${value} позиции`;
  return `${value} позиций`;
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makeProduct(product) {
  const article = makeElement("article", "catalog-product");
  const head = makeElement("div", "catalog-product-head");
  const title = makeElement("h4", "", typographText(product.name));
  const price = makeElement("strong", "", typographPrice(product.price));
  const description = product.description
    ? makeElement("p", "", typographText(product.description))
    : null;

  head.append(title, price);
  article.append(head);
  if (description) article.append(description);
  return article;
}

function makeCategory(category) {
  const section = makeElement("section", "catalog-category");
  const header = makeElement("div", "catalog-category-header");
  const title = makeElement("h3", "", typographText(category.label));
  const categoryCount = makeElement(
    "p",
    "catalog-category-count",
    positionCount(category.items.length),
  );
  const grid = makeElement("div", "catalog-product-grid");

  section.id = `category-${category.slug}`;
  title.id = `category-title-${category.slug}`;
  section.setAttribute("aria-labelledby", title.id);
  category.items.forEach((product) => grid.append(makeProduct(product)));
  header.append(title, categoryCount);
  section.append(header, grid);
  return section;
}

function visibleCatalog() {
  const normalizedQuery = normalize(query);

  return catalog
    .filter(
      (category) =>
        activeCategory === allCategories || category.slug === activeCategory,
    )
    .map((category) => ({
      ...category,
      items: category.items.filter((product) => {
        if (!normalizedQuery) return true;

        return normalize(
          `${product.name} ${product.description ?? ""}`,
        ).includes(normalizedQuery);
      }),
    }))
    .filter((category) => category.items.length > 0);
}

function syncFilterButtons() {
  filters.querySelectorAll("button").forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.category === activeCategory),
    );
  });

  select.value = activeCategory;
}

function render() {
  syncLogoVariant();
  const visible = visibleCatalog();
  const visibleCount = visible.reduce(
    (total, category) => total + category.items.length,
    0,
  );

  list.replaceChildren();
  visible.forEach((category) => list.append(makeCategory(category)));

  if (visibleCount === 0) {
    const empty = makeElement(
      "p",
      "catalog-empty",
      "Ничего не найдено. Попробуйте другое название или откройте весь ассортимент.",
    );
    list.append(empty);
    count.textContent = "Ничего не найдено";
  } else {
    count.textContent = positionCount(visibleCount);
  }

  reset.hidden = activeCategory === allCategories && query === "";
  list.setAttribute("aria-busy", "false");
  syncFilterButtons();

  if (!initialHashHandled && categoryFromHash && activeCategory !== allCategories) {
    initialHashHandled = true;
    requestAnimationFrame(() => {
      document.getElementById(`category-${activeCategory}`)?.scrollIntoView();
    });
  }
}

function addFilter(label, value) {
  const typedLabel = typographText(label);
  const button = makeElement("button", "", typedLabel);
  const option = makeElement("option", "", typedLabel);

  option.value = value;
  button.type = "button";
  button.dataset.category = value;
  button.setAttribute("aria-pressed", String(value === activeCategory));
  button.addEventListener("click", () => {
    activeCategory = value;
    render();
  });
  filters.append(button);
  select.append(option);
}

addFilter("Весь ассортимент", allCategories);
catalog.forEach((category) => addFilter(category.shortLabel, category.slug));

search.addEventListener("input", (event) => {
  query = event.currentTarget.value;
  render();
});

select.addEventListener("change", (event) => {
  activeCategory = event.currentTarget.value;
  render();
});

reset.addEventListener("click", () => {
  activeCategory = allCategories;
  query = "";
  search.value = "";
  render();
  search.focus();
});

search.value = query;
render();
