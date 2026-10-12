import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { catalog } from "../assets/catalog-data.js";
import { catalogPrice, productLabel, productDescription, orderLinks, positionCount, productNotes, productSearchText, productKey } from "../assets/catalog-model.js";
import { typographText } from "../assets/typography.js";
import { recipeContent, productRecipeLinks, matchesProduct } from "./recipe-content.mjs";
import { olegSources as sources, audioTime, audioFragmentHref } from "./oleg-content.mjs";

const path = fileURLToPath(new URL("../catalog/index.html", import.meta.url));
const original = readFileSync(path, "utf8");
const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const text = (value) => escape(typographText(value));
const journal = JSON.parse(readFileSync(new URL("../content/journal.json", import.meta.url), "utf8"));
const guidance = JSON.parse(readFileSync(new URL("../content/catalog-guidance.json", import.meta.url), "utf8"));
const normalize = value => value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/gu, " ").trim();
const productIds = new Set(catalog.flatMap(category => category.items.map(product => product.id)));
const guidedProducts = new Set();
for (const item of guidance) {
  if (!productIds.has(item.product) || guidedProducts.has(item.product)) throw new Error(`Invalid guidance product: ${item.product}`);
  const source = item.entry ? journal.find(entry => entry.id === item.entry) : sources.textSources.find(source => source.id === item.source);
  if (!source) throw new Error(`Missing guidance source: ${item.entry ?? item.source}`);
  const body = readFileSync(new URL(item.entry ? `../content/journal/${item.entry}.html` : `../content/sources/${source.sourceFile}`, import.meta.url), "utf8");
  if (!item.quote || !normalize(body).includes(normalize(item.quote))) throw new Error(`Guidance must quote Oleg verbatim: ${item.product}`);
  guidedProducts.add(item.product);
}
for (const source of [...sources.audio, ...sources.video]) {
  if (!source.label || !/^https:\/\//.test(source.url) || source.products.some(id => !productIds.has(id))) throw new Error(`Invalid Oleg media source: ${source.id}`);
}
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
  const tip = guidance.find(item => item.product === product.id);
  const source = tip && journal.find(entry => entry.id === tip.entry);
  const externalSource = tip?.source && sources.textSources.find(source => source.id === tip.source);
  const audioChapters = sources.audio.flatMap(audio => audio.chapters
    .filter(chapter => chapter.products.includes(product.id)).map(chapter => ({ audio, chapter })));
  const related = productRecipeLinks(category, product);
  const audioNote = !tip && !related.length && audioChapters[0];
  const adviceEntries = (source ? [source, ...related.filter(entry => entry.id !== source.id)] : related).slice(0, 2);
  const advice = adviceEntries.map(recipe =>
    adviceLink(`../journal/${recipe.id}/`, recipe.title, journal.find(entry => entry.id === recipe.id)));
  if (externalSource) advice.unshift(`<a href="${escape(externalSource.url)}">${text(externalSource.label)} · ${text(externalSource.site)} · <time datetime="${externalSource.date}">${text(new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${externalSource.date}T12:00:00Z`)).replace(/ г\.$/, ""))}</time></a>`);
  for (const story of recipeContent.productStories.filter(story => story.products.some(selection => matchesProduct(selection, category, product)))) {
    advice.push(adviceLink(story.source, story.label, story));
  }
  for (const { audio, chapter } of audioChapters) advice.push(`<a href="${escape(audioFragmentHref(audio, chapter))}">${text(`Послушать: ${chapter.label} · ${audio.label} · ${audioTime(chapter.start)} · SoundCloud`)}</a>`);
  for (const video of sources.video.filter(source => source.products.includes(product.id))) advice.push(`<a href="${escape(video.url)}">${text(`${video.label} · YouTube`)}</a>`);
  return `
              <article class="catalog-product" id="product-${escape(product.id)}" tabindex="-1" data-product-id="${escape(product.id)}" data-search-text="${escape(keywords)}" data-product-name="${escape(product.name)}" data-product-category="${category.slug}"${product.previousCategory ? ` data-previous-category="${product.previousCategory}"` : ""}>
                <div class="catalog-product-head"><h4>${text(product.name)}</h4><strong>${escape(catalogPrice(product.price))}</strong></div>${product.description ? `
                <p>${text(productDescription(product))}</p>` : ""}${notes ? `
                <p>${escape(notes)}</p>` : ""}
                <div class="catalog-product-actions" hidden>
                  <button type="button" class="catalog-product-add" data-order-add value="${escape(productKey(category, product))}"><span>В список заказа</span></button>
                  <span class="catalog-product-added" data-order-added aria-hidden="true" hidden>Добавлено</span>
                  <button type="button" class="catalog-product-remove" data-order-remove value="${escape(productKey(category, product))}" aria-label="Убрать из списка: ${escape(productLabel(product))}" hidden>Убрать</button>
                </div>
                <details class="catalog-product-order">
                  <summary id="order-${escape(product.id)}">Уточнить наличие<span class="visually-hidden">: ${escape(productLabel(product))}</span></summary>
                  <div class="catalog-product-order__channels">
                    <a href="${escape(links.telegram)}">В&nbsp;Телеграме</a>
                    <a href="${escape(links.whatsapp)}">В&nbsp;WhatsApp</a>
                    <a href="tel:+79166751452">Позвонить</a>
                  </div>
                </details>${advice.length ? `
                <div class="catalog-product-advice"><span>${tip || related.length ? "Олег советует" : "Олег рассказывает"}</span>${tip ? `<blockquote cite="${escape(externalSource?.url ?? `../journal/${tip.entry}/`)}">${text(tip.quote)}</blockquote>` : audioNote ? `<p class="catalog-audio-note">${text(audioNote.chapter.note)}</p>` : ""}${advice.join("\n                  ")}</div>` : ""}
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
for (const [key, content] of Object.entries({ products,
  filters: filters + '\n                    <button type="button" data-category="other" data-legacy-category aria-pressed="false" hidden>Прежние «Новинки и прочее»</button>',
  options: options + '\n                    <option value="other" data-legacy-category hidden>Прежние «Новинки и прочее»</option>',
})) {
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
