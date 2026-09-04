import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { catalog } from "../assets/catalog-data.js";
import { orderLinks, positionCount } from "../assets/catalog-model.js";
import { typographPrice, typographText } from "../assets/typography.js";

const path = fileURLToPath(new URL("../catalog/index.html", import.meta.url));
const original = readFileSync(path, "utf8");
const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const text = (value) => escape(typographText(value));

const products = catalog.map((category) => `
          <section class="catalog-category" id="category-${category.slug}" data-category="${category.slug}" aria-labelledby="category-title-${category.slug}">
            <div class="catalog-category-header">
              <h3 id="category-title-${category.slug}">${text(category.label)}</h3>
              <p class="catalog-category-count">${positionCount(category.items.length)}</p>
            </div>
            <div class="catalog-product-grid">${category.items.map((product) => {
  const links = orderLinks(product);
  const keywords = `${category.label} ${category.shortLabel} ${product.name} ${product.description ?? ""}`;
  return `
              <article class="catalog-product" data-search-text="${escape(keywords)}">
                <div class="catalog-product-head"><h4>${text(product.name)}</h4><strong>${escape(typographPrice(product.price))}</strong></div>${product.description ? `
                <p>${text(product.description)}</p>` : ""}
                <details class="catalog-product-order">
                  <summary>Заказать<span class="visually-hidden">: ${text(product.name)}, ${escape(typographPrice(product.price))}</span></summary>
                  <div class="catalog-product-order__channels">
                    <a href="${escape(links.telegram)}">В&nbsp;Телеграме</a>
                    <a href="${escape(links.whatsapp)}">В&nbsp;WhatsApp</a>
                  </div>
                </details>
              </article>`;
}).join("")}
            </div>
          </section>`).join("\n");

const categories = [{ slug: "all", shortLabel: "Весь ассортимент" }, ...catalog];
const filters = categories.map((category) => `
                    <button type="button" data-category="${category.slug}" aria-pressed="${category.slug === "all"}">${text(category.shortLabel)}</button>`).join("");
const options = categories.map((category) => `
                    <option value="${category.slug}">${text(category.shortLabel)}</option>`).join("");
let result = original;
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
