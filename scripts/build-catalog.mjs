import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { catalog } from "../assets/catalog-data.js";
import { catalogPrice, orderLinks, positionCount, productNotes, productSearchText, productKey } from "../assets/catalog-model.js";
import { typographText } from "../assets/typography.js";
import { recipeContent, productRecipeLinks, matchesProduct } from "./recipe-content.mjs";

const path = fileURLToPath(new URL("../catalog/index.html", import.meta.url));
const original = readFileSync(path, "utf8");
const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const text = (value) => escape(typographText(value));
const journal = JSON.parse(readFileSync(new URL("../content/journal.json", import.meta.url), "utf8"));
const media = JSON.parse(readFileSync(new URL("../assets/media-variants.json", import.meta.url), "utf8"));
function adviceLink(href, title, photo) {
  const variants = media.filter(item => item.source === photo?.image && item.width > 32).sort((a, b) => a.width - b.width);
  if (!variants.length) return `<a href="${escape(href)}">${text(title)}</a>`;
  const { width, height } = variants.at(-1);
  return `<a class="catalog-advice-link" href="${escape(href)}">${text(title)}<span class="catalog-advice-photo" aria-hidden="true"><img src="../assets/${escape(variants[0].file)}" srcset="${variants.map(item => `../assets/${escape(item.file)} ${item.width}w`).join(", ")}" sizes="240px" width="${width}" height="${height}" loading="lazy" decoding="async" alt="" /></span></a>`;
}

const products = catalog.map((category) => `
          <section class="catalog-category" id="category-${category.slug}" data-category="${category.slug}" aria-labelledby="category-title-${category.slug}">
            <div class="catalog-category-header">
              <h3 id="category-title-${category.slug}">${text(category.label)}</h3>
              <p class="catalog-category-count">${positionCount(category.items.length)}</p>
            </div>
            <div class="catalog-product-grid">${category.items.map((product) => {
  const links = orderLinks(product);
  const keywords = productSearchText(category, product);
  const notes = productNotes(product);
  const advice = productRecipeLinks(category, product).slice(0, 2).map(recipe =>
    adviceLink(`../journal/${recipe.id}/`, recipe.title, journal.find(entry => entry.id === recipe.id)));
  for (const story of recipeContent.productStories.filter(story => story.products.some(selection => matchesProduct(selection, category, product)))) {
    advice.push(adviceLink(story.source, story.label, story));
  }
  return `
              <article class="catalog-product" id="product-${escape(product.id)}" tabindex="-1" data-product-id="${escape(product.id)}" data-search-text="${escape(keywords)}" data-product-name="${escape(product.name)}" data-product-category="${category.slug}">
                <div class="catalog-product-head"><h4>${text(product.name)}</h4><strong>${escape(catalogPrice(product.price))}</strong></div>${product.description ? `
                <p>${text(product.description)}</p>` : ""}${notes ? `
                <p>${escape(notes)}</p>` : ""}
                <div class="catalog-product-actions" hidden>
                  <button type="button" class="catalog-product-add" data-order-add value="${escape(productKey(category, product))}"><span>В список заказа</span></button>
                  <span class="catalog-product-added" data-order-added aria-hidden="true" hidden>Добавлено</span>
                  <button type="button" class="catalog-product-remove" data-order-remove value="${escape(productKey(category, product))}" aria-label="Убрать из списка: ${text(product.name)}, ${escape(catalogPrice(product.price))}" hidden>Убрать</button>
                </div>
                <details class="catalog-product-order">
                  <summary>Уточнить наличие<span class="visually-hidden">: ${text(product.name)}, ${escape(catalogPrice(product.price))}</span></summary>
                  <div class="catalog-product-order__channels">
                    <a href="${escape(links.telegram)}">В&nbsp;Телеграме</a>
                    <a href="${escape(links.whatsapp)}">В&nbsp;WhatsApp</a>
                  </div>
                </details>${advice.length ? `
                <div class="catalog-product-advice"><span>Олег советует</span>${advice.join("\n                  ")}</div>` : ""}
              </article>`;
}).join("")}
            </div>
          </section>`).join("\n");

const categories = [{ slug: "all", shortLabel: "Весь ассортимент" }, ...catalog];
const filters = categories.map((category) => `
                    <button type="button" data-category="${category.slug}" aria-pressed="${category.slug === "all"}">${text(category.shortLabel)}</button>`).join("");
const options = categories.map((category) => `
                    <option value="${category.slug}">${text(category.shortLabel)}</option>`).join("");
let result = original.replace(/(data-catalog-count>\s*)[\d\s\u00a0]+позиций/, `$1${positionCount(catalog.reduce((sum, c) => sum + c.items.length, 0))}`);
for (const [key, content] of Object.entries({ products, filters, options })) {
  const pattern = new RegExp(`(<!-- catalog-${key}:start -->)[\\s\\S]*?(<!-- catalog-${key}:end -->)`);
  if (!pattern.test(result)) throw new Error(`Missing generated region: ${key}`);
  result = result.replace(pattern, (_, start, end) => `${start}${content}\n                ${end}`);
}
if (process.argv.includes("--check")) {
  if (result !== original) {
    console.error("Статический прайс не совпадает с данными. Выполните pnpm build:catalog.");
    process.exitCode = 1;
  }
} else if (result !== original) {
  writeFileSync(path, result);
}
