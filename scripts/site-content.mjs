import { readFileSync } from "node:fs";
import { typographText } from "../assets/typography.js";
import { catalog } from "../assets/catalog-data.js";
import { catalogPrice, productNotes } from "../assets/catalog-model.js";

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

function date(entry, year = true) {
  const parts = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric", month: "long", ...(year ? { year: "numeric" } : {}), timeZone: "UTC",
  }).formatToParts(new Date(`${entry.date}T12:00:00Z`));
  return parts.filter(part => ["day", "month", "year"].includes(part.type)).map(part => part.value).join(" ");
}

function image(entry, root, sizes, deferred = false, hero = false) {
  const variants = media.filter(item => item.source === entry.image && item.width > 32).sort((a, b) => a.width - b.width);
  if (!variants.length) throw new Error(`No media variants for journal entry ${entry.id}`);
  const srcset = variants.map(item => `${root}assets/${item.file} ${item.width}w`).join(", ");
  const { width, height } = variants.at(-1);
  const source = `${root}assets/${entry.image}`;
  const src = `${root}assets/${variants[0].file}`;
  const attrs = deferred
    ? `src="${source.replace(/\.jpg$/, "-32.webp")}" data-full-src="${src}" data-full-srcset="${srcset}"`
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
                <div class="ship-log-entry__body">
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
    theme: renderTheme("journal"), menu: renderMenu("journal", "../../"), footer: renderFooter("journal", "../../"),
    article: renderJournal([entry], "article"), neighbors,
    url, title: text(entry.title), description: text(`${plain(entry.title).replace(/[.!?]+$/u, "")}. Запись Олега Гугунавы от ${date(entry)} в Судовом журнале Рыбной лавки капитана Селедкина.`),
    shareImage: `https://ks.fish/assets/${entry.image}`, alt: text(entry.alt),
    imageWidth: native.width, imageHeight: native.height, published: entry.date,
  }) + "\n";
}
