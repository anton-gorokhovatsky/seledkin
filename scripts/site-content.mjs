import { readFileSync } from "node:fs";
import { typographText } from "../assets/typography.js";
import { catalog } from "../assets/catalog-data.js";
import { catalogPrice, productNotes } from "../assets/catalog-model.js";
import { recipeContent, recipes, resolveProduct, productCatalogHref, productRecipeLinks } from "./recipe-content.mjs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const site = JSON.parse(read("content/site.json"));
export const store = site.store;
const validHours = hours => hours && /^([01]\d|2[0-3]):[0-5]\d$/.test(hours.open)
  && /^([01]\d|2[0-3]):[0-5]\d$/.test(hours.close) && hours.open < hours.close;
if (store.timeZone !== "Europe/Moscow" || !validHours(store.hours)) throw new Error("Invalid regular shop hours");
for (const [date, hours] of Object.entries(store.exceptions)) {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime())
    || parsed.toISOString().slice(0, 10) !== date || (hours !== null && !validHours(hours))) {
    throw new Error(`Invalid shop-hours exception: ${date}`);
  }
}
export const regularHours = `Ежедневно с&nbsp;${store.hours.open} до&nbsp;${store.hours.close}`;
const media = JSON.parse(read("assets/media-variants.json"));
export const entries = JSON.parse(read("content/journal.json")).map(entry => ({
  ...entry,
  body: read(`content/journal/${entry.id}.html`).trim(),
}));

const escape = value => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const plain = value => value.replaceAll("&nbsp;", "\u00a0").replaceAll("&amp;", "&").replaceAll("&quot;", '"');
const text = value => escape(typographText(plain(value)));

export function renderDelivery(view) {
  const { area, priceRub, minimumOrderRub } = site.delivery;
  const price = text(`${priceRub} ₽`);
  if (view === "home") return `Стоимость доставки ${text(area)} — <strong>${price}.</strong> ${minimumOrderRub === 0
    ? "Минимальной суммы заказа нет, это удобно."
    : `Минимальная сумма заказа — ${text(`${minimumOrderRub} ₽`)}.`}`;
  return `Доставка по Москве ${text(area)} — ${price}, ${minimumOrderRub === 0
    ? "без минимальной суммы заказа."
    : `от ${text(`${minimumOrderRub} ₽`)} за заказ.`}`;
}

export function renderPricePreview() {
  return site.pricePreview.map(selection => {
    const category = catalog.find(item => item.slug === selection.category);
    // When sizes share a name, the first listed size is the homepage example.
    const product = category?.items.find(item => item.name === selection.name);
    if (!product) throw new Error(`Missing preview product: ${selection.name}`);
    const query = new URLSearchParams({ q: product.name, category: category.slug });
    const notes = productNotes(product);
    return `              <article class="catalog-product">
                <div class="catalog-product-head">
                  <h4><a href="catalog/?${escape(query)}">${text(selection.label ?? product.name)}</a></h4><strong>${escape(catalogPrice(product.price))}</strong>
                </div>
                <p>${text(selection.description ?? product.description)}</p>${notes ? `
                <p>${escape(notes)}</p>` : ""}
              </article>`;
  }).join("\n");
}

function template(name, values) {
  return read(`templates/${name}.html`).trimEnd().replace(/{{(\w+)}}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Missing ${name} template value: ${key}`);
    return values[key];
  });
}

const street = `${site.address.city}, ${site.address.street}`;
const metro = `метро ${site.address.metro}`;
export const contactAddress = `${street}. Метро ${site.address.metro}.`;

function routeLinks(page, root, numbered) {
  return site.routes.map(({ href, label }, index) => {
    const current = href === `${page}/` ? ' aria-current="page"' : "";
    return numbered
      ? `              <a href="${root}${href}"${current}>
                <span aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
                <span>${label}</span>
              </a>`
      : `      <a href="${root}${href}"${current}>${label}</a>`;
  }).join("\n");
}

export function renderMenu(page, root) {
  return template("menu", {
    root,
    brandOpen: page === "home"
      ? '<div class="site-menu__brand brand-jelly brand-jelly--panel">'
      : `<a class="site-menu__brand brand-jelly brand-jelly--panel" href="${root}">`,
    brandClose: page === "home" ? "</div>" : "</a>",
    routes: routeLinks(page, root, true),
    regularHours,
    menuAddress: `${street}<br />\n                Метро ${site.address.metro}`,
  });
}

export function renderFooter(page, root) {
  const fallback = `    <nav class="site-navigation-fallback source-shell" id="site-navigation-fallback" aria-label="Разделы сайта" tabindex="-1" data-menu-fallback>
${routeLinks(page, root, false)}
    </nav>`;
  return `${fallback}\n${template("footer", {
    root, footerId: page === "catalog" ? "catalog-footer-title" : "footer-title",
    regularHours: `Каждый день с ${store.hours.open} до ${store.hours.close}`,
    footerAddress: `${street}; ${metro}`,
  })}`;
}

export function renderTheme(page) {
  return template("theme-bootstrap", {
    themeSchedule: JSON.stringify({ timeZone: store.timeZone, ...store.hours }),
    baseSetup: page === "404" ? `        const base = document.querySelector("base");
        base.href = window.location.hostname.endsWith(".github.io")
          ? "/seledkin/"
          : "/";` : "",
    posterPreload: page === "home" ? `        const posterPreload = document.createElement("link");
        posterPreload.rel = "preload";
        posterPreload.as = "image";
        posterPreload.fetchPriority = "high";
        posterPreload.href = isDark ? "assets/hero-sea-night-poster.webp" : "assets/hero-sea-poster.webp";
        document.head.append(posterPreload);` : "",
  }).replaceAll(/\n\n/g, "\n");
}

export function renderAnalytics(root) {
  return `    <script type="module" src="${root}assets/analytics.js?v=analytics-2"></script>`;
}

function date(entry, year = true) {
  const parts = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric", month: "long", ...(year ? { year: "numeric" } : {}), timeZone: "UTC",
  }).formatToParts(new Date(`${entry.date}T12:00:00Z`));
  return parts.filter(part => ["day", "month", "year"].includes(part.type)).map(part => part.value).join(" ");
}

export function image(entry, root, sizes, deferred = false, hero = false) {
  const variants = media.filter(item => item.source === entry.image && item.width > 32).sort((a, b) => a.width - b.width);
  if (!variants.length) throw new Error(`No media variants for journal entry ${entry.id}`);
  const srcset = variants.map(item => `${root}assets/${item.file} ${item.width}w`).join(", ");
  const { width, height } = variants.at(-1);
  const source = `${root}assets/${entry.image}`;
  const src = `${root}assets/${variants[0].file}`;
  const attrs = deferred
    ? `src="${media.find(item => item.source === entry.image && item.width === 32) ? source.replace(/\.jpg$/, "-32.webp") : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/%3E"}" data-full-src="${src}" data-full-srcset="${srcset}"`
    : `src="${src}" srcset="${srcset}"`;
  return `<img ${attrs} sizes="${sizes}" data-source-image="${source}" decoding="async" alt="${entry.alt}" width="${width}" height="${height}"${hero ? (deferred ? "" : ' fetchpriority="high"') : ' loading="lazy"'} />`;
}

export function renderJournal(list, view) {
  return list.map((entry, index) => {
    const { id, title } = entry;
    if (view === "hero") return `              <a class="source-hero__proof source-hero__journal-card" href="journal/${id}/" aria-label="Перейти к&nbsp;записи в&nbsp;журнале: ${title}"${index ? ' aria-hidden="true" tabindex="-1"' : ""} data-hero-journal-card data-stack-position="${index}">
                <figure>
                  ${image(entry, "", "(max-width: 61.1875rem) min(88vw, 340px), 288px", index > 0, true)}
                  <figcaption><span class="source-hero__proof-meta"><time datetime="${entry.date}">${date(entry, false)}</time></span><strong>${title}</strong></figcaption>
                </figure>
              </a>`;
    if (view === "preview") return `            <a class="journal-preview__entry" href="journal/${id}/" aria-labelledby="journal-preview-${id}">
              <div class="journal-preview__media">
                ${image(entry, "", "(max-width: 22rem) calc(100vw - 36px), (max-width: 61.1875rem) min(28vw, 128px), 368px")}
              </div>
              <div class="journal-preview__copy">
                <time datetime="${entry.date}">${date(entry)}</time>
                <h3 id="journal-preview-${id}">${title}</h3>
                <span class="journal-preview__link">Читать запись</span>
              </div>
            </a>`;
    if (view === "archive" || view === "search") {
      const root = "../";
      return `            <article class="journal-index-entry" id="journal-entry-${id}" tabindex="-1"${view === "search" ? ` data-journal-result data-search-text="${text(`${entry.title} ${entry.product}`)}" hidden` : ""}>
              <a class="journal-index-entry__link" href="${view === "search" ? "../journal/" : ""}${id}/" aria-labelledby="entry-title-${id}">
                ${image(entry, root, "(max-width: 34rem) 80px, 144px")}
                <div>
                  <time datetime="${entry.date}">${date(entry)}</time>
                  <${view === "search" ? "h3" : "h2"} id="entry-title-${id}">${title}</${view === "search" ? "h3" : "h2"}>
                  <span class="journal-index-entry__read">Читать запись</span>
                </div>
              </a>
            </article>`;
    }
    if (view !== "article") throw new Error(`Unknown journal view: ${view}`);
    const source = `https://t.me/kapitanseledkin/${id}`;
    const inquiry = `Здравствуйте! Подскажите, пожалуйста, есть ли в наличии:\n${entry.product}\nУвидел(а) в Судовом журнале: ${source}`;
    return `            <article class="ship-log-entry journal-story" data-journal-id="${id}" id="journal-entry-${id}" tabindex="-1">
              <header class="journal-story__header page-intro">
                <p class="page-intro__eyebrow">Судовой журнал · Олег Гугунава</p>
                <h1 class="page-intro__title">${title}</h1>
                <p class="ship-log-entry__meta"><time datetime="${entry.date}">${date(entry)}</time> <span>Запись №&nbsp;${id}</span></p>
              </header>
              ${image(entry, "../../", "(max-width: 61.1875rem) calc(100vw - 36px), 42vw", false, true)}
              <div class="ship-log-entry__content">
${recipes.some(recipe => recipe.id === id) ? `                <p class="recipe-archive-note">Цены и условия в авторском тексте относятся к дате публикации. Действующие цены — <a href="../../catalog/">в каталоге</a>.</p>\n` : ""}                <div class="ship-log-entry__body">
${entry.body.split("\n").map(line => `                  ${line}`).join("\n")}
                </div>
                <div class="ship-log-entry__actions">
                  <a class="source-button source-button--telegram" href="https://t.me/+79166751452?text=${encodeURIComponent(plain(inquiry))}"><span class="source-button__label">Спросить о наличии<span class="visually-hidden"> в Телеграме: ${text(entry.product)}</span></span></a>
                  <a class="ship-log-entry__link" href="${source}">Читать запись в Телеграме</a>
                </div>
              </div>
            </article>`;
  }).join(view === "archive" ? "\n\n" : "\n");
}

export function renderJournalPage(entry) {
  const url = `https://ks.fish/journal/${entry.id}/`;
  const native = media.filter(item => item.source === entry.image).sort((a, b) => b.width - a.width)[0];
  const index = entries.findIndex(item => item.id === entry.id);
  const harpoon = `<svg viewBox="0 0 32 18" aria-hidden="true" focusable="false"><path d="M23 9H8.5C4.6 9 2.5 10.8 2.5 13.2c0 2.1 1.7 3.4 3.7 2.6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" /><path d="M19.5 3 30 9l-10.5 6 3.1-6-3.1-6Z" fill="currentColor" /></svg>`;
  const neighbors = [entries[index + 1], entries[index - 1]].filter(Boolean).map(item => {
    const previous = item.id < entry.id;
    const label = previous ? `${harpoon}Предыдущая запись` : `Следующая запись${harpoon}`;
    return `<a href="../${item.id}/" rel="${previous ? "prev" : "next"}"><span class="journal-story__direction">${label}</span><span class="journal-story__neighbor-title">${item.title}</span></a>`;
  }).join("\n");
  return template("journal-page", {
    theme: renderTheme("journal"), analytics: renderAnalytics("../../"), menu: renderMenu("journal", "../../"), footer: renderFooter("journal", "../../"),
    article: renderJournal([entry], "article") + renderRecipeContext(entry), neighbors,
    recipeBack: recipes.some(recipe => recipe.id === entry.id) ? '<a href="../../recipes/">Рецепты и советы</a>' : "",
    url, title: text(entry.title), description: text(`${plain(entry.title).replace(/[.!?]+$/u, "")}. Запись Олега Гугунавы от ${date(entry)} в Судовом журнале Рыбной лавки капитана Селедкина.`),
    shareImage: `https://ks.fish/assets/${entry.image}`, alt: text(entry.alt),
    imageWidth: native.width, imageHeight: native.height, published: entry.date,
  }).replace(/[ \t]+$/gm, "") + "\n";
}

const harpoon = `<svg viewBox="0 0 32 18" aria-hidden="true" focusable="false"><path d="M23 9H8.5C4.6 9 2.5 10.8 2.5 13.2c0 2.1 1.7 3.4 3.7 2.6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" /><path d="M19.5 3 30 9l-10.5 6 3.1-6-3.1-6Z" fill="currentColor" /></svg>`;
const recipeEntry = recipe => {
  const entry = entries.find(item => item.id === recipe.id);
  if (!entry) throw new Error(`Missing recipe story: ${recipe.id}`);
  return entry;
};

function currentProduct(selection, root, heading = "h3", includeRecipe = true) {
  const { category, product } = resolveProduct(selection);
  const related = includeRecipe ? productRecipeLinks(category, product).find(recipe => recipe.kind === "recipe") : null;
  return `<article class="meal-product">
      <${heading}><a href="${escape(productCatalogHref(selection, root))}">${text(product.name)}</a></${heading}>
      <p>${text(product.description ?? category.label)}</p>
      <strong>${escape(catalogPrice(product.price))}</strong>
      ${related ? `<a class="editorial-link" href="${root}journal/${related.id}/">${text(related.title)}${harpoon}</a>` : ""}
    </article>`;
}

function renderRecipeContext(entry) {
  const recipe = recipes.find(item => item.id === entry.id);
  if (!recipe) return "";
  const sequence = recipe.sequence?.map(shot => `<figure class="recipe-sequence">
    ${image(shot, "../../", "(max-width: 61.1875rem) calc(100vw - 36px), 640px")}
    <figcaption>${text(shot.caption)}</figcaption>
  </figure>`).join("\n") ?? "";
  const current = recipe.products.length ? `<section class="recipe-current" aria-labelledby="recipe-current-title">
    <header><p class="page-intro__eyebrow">${recipe.kind === "recipe" ? "Для этого рецепта" : "В рассказе Олега"}</p><h2 id="recipe-current-title">В каталоге лавки</h2></header>
    <div class="meal-products">${recipe.products.map(selection => currentProduct(selection, "../../", "h3", false)).join("\n")}</div>
  </section>` : "";
  return `\n${sequence}${recipe.videoSource ? `<p class="recipe-video-source"><a class="editorial-link" href="${recipe.videoSource}">Смотреть авторское видео в Телеграме${harpoon}</a></p>` : ""}${current}`;
}

const recipeQuote = recipeContent.editorial.find(item => item.id === recipeContent.featured).excerpt;
function recipeFeature(root, heading = "h3") {
  const recipe = recipes.find(item => item.id === recipeContent.featured);
  const entry = recipeEntry(recipe);
  return `<article class="recipe-feature" aria-labelledby="recipe-feature-title">
    <a class="recipe-feature__photo" href="${root}journal/${entry.id}/" aria-label="Рецепт: ${text(recipe.title)}">${image(entry, root, "(max-width: 61.1875rem) calc(100vw - 36px), 520px")}</a>
    <div class="recipe-feature__copy">
      <p class="recipe-meta">Рецепт Олега · <time datetime="${entry.date}">${date(entry)}</time></p>
      <${heading} id="recipe-feature-title">${text(recipe.title)}</${heading}>
      <blockquote><p>${text(recipeQuote)}</p></blockquote>
      <a class="editorial-link" href="${root}journal/${entry.id}/">Приготовить по рецепту${harpoon}</a>
      <a class="editorial-link recipe-feature__catalog" href="${escape(productCatalogHref(recipe.products[0], root))}">Филе трески в каталоге${harpoon}</a>
    </div>
  </article>`;
}

export function renderRecipeHome() {
  return `<header class="watch-catch__header">
    <h2 id="watch-catch-title">Рецепты и советы</h2>
    <a class="editorial-link" href="recipes/">Все рецепты и советы${harpoon}</a>
  </header>
  ${recipeFeature("")}
  <ul class="watch-catch__list">${recipeContent.home.map(id => {
    const recipe = recipes.find(item => item.id === id);
    return `<li class="watch-catch__item"><a href="journal/${id}/"><span class="recipe-meta">Рецепт Олега</span><span class="watch-catch__name">${text(recipe.title)}</span>${harpoon}</a></li>`;
  }).join("\n")}</ul>`;
}

function renderRecipeEditorial(root) {
  const selected = recipeContent.editorial.map(item => {
    const recipe = recipes.find(recipe => recipe.id === item.id && recipe.kind === "recipe");
    if (!recipe || recipe.products.length !== 1) throw new Error(`Invalid editorial recipe: ${item.id}`);
    const entry = recipeEntry(recipe);
    const normalized = value => plain(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    for (const quote of [item.pull, item.excerpt]) {
      if (!normalized(entry.body).includes(normalized(quote))) throw new Error(`Editorial quote differs from Oleg's source: ${item.id}`);
    }
    return { ...item, recipe, entry, product: resolveProduct(recipe.products[0]).product };
  });
  const meta = item => `<p class="recipe-meta">Рецепт Олега · <time datetime="${item.entry.date}">${date(item.entry)}</time></p>`;
  const title = item => `<h2 id="recipe-editorial-${item.id}">${text(item.noun)} <em>${text(item.ending)}</em></h2>`;
  const actions = item => `<div class="recipe-editorial-actions"><a class="editorial-link" href="${root}journal/${item.id}/" aria-label="Читать рецепт: ${text(item.recipe.title)}">Читать рецепт${harpoon}</a><a class="editorial-link recipe-editorial-actions__catalog" href="${escape(productCatalogHref(item.recipe.products[0], root))}">${text(item.product.name)} в каталоге${harpoon}</a></div>`;
  const product = item => `<div class="recipe-editorial-product"><div><p class="recipe-editorial-product__label">Для этого рецепта</p><p class="recipe-editorial-product__name">${text(item.product.name)}</p><p class="recipe-editorial-product__origin">${text(item.product.description)}</p></div><strong>${escape(catalogPrice(item.product.price)).replace("/", "<wbr>/")}</strong></div>`;
  const [lead, ...pair] = selected;
  return `<div class="recipe-editorial-opening">
    <article class="recipe-feature recipe-editorial-lead" aria-labelledby="recipe-editorial-${lead.id}">
      <div class="recipe-editorial-lead__heading">${meta(lead)}${title(lead)}<blockquote class="recipe-editorial-pull"><p>«${text(lead.pull)}»</p></blockquote></div>
      <figure class="recipe-feature__photo recipe-editorial-lead__photo">${image(lead.entry, root, "(max-width: 46rem) calc(100vw - 36px), 58vw", false, true)}<figcaption>Фотография Олега к рецепту</figcaption></figure>
      <div class="recipe-editorial-lead__note"><p>${text(lead.excerpt)}</p>${actions(lead)}</div>
      <div class="recipe-editorial-lead__product">${product(lead)}</div>
    </article>
    <div class="recipe-editorial-pair">${pair.map(item => `<article class="recipe-editorial-story" aria-labelledby="recipe-editorial-${item.id}">
      <figure>${image(item.entry, root, "(max-width: 46rem) calc(100vw - 36px), 46vw")}</figure>
      <div class="recipe-editorial-story__copy">${meta(item)}${title(item)}<blockquote class="recipe-editorial-pull"><p>${text(item.pull)}.</p></blockquote><p>${text(item.excerpt)}</p>${product(item)}${actions(item)}</div>
    </article>`).join("\n")}</div>
  </div>`;
}

export function renderRecipesPage() {
  const featuredIds = new Set(recipeContent.editorial.map(item => item.id));
  const groups = [["recipes", "Ещё рецепты", "recipe"], ["advice", "Советы о рыбе", "advice"]].map(([id, title, kind]) => `<section class="recipe-directory${kind === "recipe" ? " recipe-directory--editorial" : ""}" id="${id}" ${kind === "recipe" ? 'aria-label="Рецепты Олега"' : `aria-labelledby="${id}-title"`}>
    ${kind === "recipe" ? renderRecipeEditorial("../") : ""}
    <header class="recipe-section-heading"><h2 id="${id}-title">${title}</h2><p>${recipes.filter(item => item.kind === kind && !featuredIds.has(item.id)).length} ${kind === "recipe" ? "рецептов" : "совета"}</p></header>
    <div class="recipe-directory__grid">${recipes.filter(recipe => recipe.kind === kind && !featuredIds.has(recipe.id)).map(recipe => {
      const entry = recipeEntry(recipe);
      return `<a class="recipe-card" href="../journal/${entry.id}/" aria-labelledby="recipe-title-${entry.id}">
        ${image(entry, "../", "(max-width: 34rem) calc(100vw - 36px), (max-width: 61.1875rem) 42vw, 320px")}
        <span class="recipe-meta"><time datetime="${entry.date}">${date(entry)}</time></span>
        <h3 id="recipe-title-${entry.id}">${text(recipe.title)}</h3>
        <span class="recipe-card__read">${kind === "recipe" ? "Читать рецепт" : "Читать совет"}${harpoon}</span>
      </a>`;
    }).join("\n")}</div>
  </section>`).join("\n");
  const collections = `<section class="meal-collections" id="meals" aria-labelledby="meals-title">
    <header class="recipe-section-heading"><h2 id="meals-title">Что купить к ужину</h2><p>Выбор из каталога</p></header>
    ${recipeContent.collections.map(collection => `<section class="meal-collection" id="${collection.slug}" aria-labelledby="meal-${collection.slug}">
      <header><h3 id="meal-${collection.slug}">${text(collection.title)}</h3><p>${text(collection.description)}</p></header>
      <div class="meal-products">${collection.products.map(selection => currentProduct(selection, "../", "h4")).join("\n")}</div>
    </section>`).join("\n")}
    <a class="editorial-link" href="../catalog/">Открыть весь каталог${harpoon}</a>
  </section>`;
  return template("recipes-page", {
    theme: renderTheme("recipes"), analytics: renderAnalytics("../"), menu: renderMenu("recipes", "../"), footer: renderFooter("recipes", "../"),
    groups, collections,
    recipeJump: [["recipes-title", "Ещё рецепты"], ["advice", "Советы о рыбе"], ["meals", "Что купить к ужину"]]
      .map(([id, label]) => `<a href="#${id}">${label}${harpoon}</a>`).join(""),
  }).replace(/[ \t]+$/gm, "") + "\n";
}

export function renderAssortmentMedia() {
  const shots = [
    { category: "caviar", image: "caviar-slab.jpg", alt: "Пласт красной икры", caption: "Красная икра" },
    { category: "seafood", ...recipeEntry(recipes.find(r => r.id === 412)), caption: "Северные креветки" },
    { category: "frozen-fish", image: "flounder.jpg", alt: "Камбала целиком на разделочной доске", caption: "Камбала" },
    { category: "fillet", image: "gallery-small-1.jpg", alt: "Коробка филе трески судовой заморозки", caption: "Филе трески судовой заморозки" },
    { category: "steaks", ...entries.find(entry => entry.id === 693), caption: "Стейки лосося" },
    { category: "prepared-fish", ...entries.find(entry => entry.id === 695), caption: "Форель холодного копчения" },
    { category: "other", image: "about-small-2.jpg", alt: "Полки с чаем, соусами и консервами в лавке", caption: "Чай, соусы и консервы" },
  ];
  return shots.map((shot, index) => `<figure class="assortment-overview__media" data-assortment-photo="${shot.category}"${index ? " hidden" : ""}>
    ${image(shot, "", "(max-width: 61.1875rem) calc(100vw - 36px), 520px", index > 0)}
    <figcaption>${text(shot.caption)}</figcaption>
  </figure>`).join("\n");
}
