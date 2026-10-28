import { readFileSync } from "node:fs";
import { countNoun, typographText } from "../assets/typography.js";
import { catalog, inventory } from "../assets/catalog-data.js";
import { catalogPrice, productNotes, productDescription, orderLinks, productHref, positionCount, groupCatalogProducts } from "../assets/catalog-model.js";
import { recipeContent, recipes, recipeOpening, recipeIngredients, resolveProduct, currentSelections, productCatalogHref, productRecipeLinks, recipeForEntry, editorialPath } from "./recipe-content.mjs";
import { olegSources, audioTime, audioFragmentHref } from "./oleg-content.mjs";

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

export const journalEntries = entries.filter(entry => !recipeForEntry(entry.id));

const escape = value => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const plain = value => value.replaceAll("&nbsp;", "\u00a0").replaceAll("&amp;", "&").replaceAll("&quot;", '"');
const text = value => escape(typographText(plain(value)));

export function renderDelivery(view) {
  const { area, priceRub, timing, minimumOrderRub } = site.delivery;
  const price = text(`${priceRub} ₽`);
  if (view === "waybill") return `<p class="delivery-source__lead">${text("Мы доставляем нашу продукцию домой или в офис")} <em>${text(`${timing[0].toLowerCase()}${timing.slice(1)}.`)}</em></p>
            <div class="delivery-waybill__charge">
              <p class="delivery-waybill__price">${price.replace(/( ₽)$/, "<span>$1</span>")}</p>
              <p class="delivery-waybill__area">${text(`${site.address.city}, ${area}`)}</p>
            </div>
            <p class="delivery-source__terms">${minimumOrderRub === 0
    ? "Минимальной суммы заказа нет, это удобно."
    : `Минимальная сумма заказа — ${text(`${minimumOrderRub} ₽`)}.`}</p>`;
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
    const notes = productNotes(product);
    return `              <article class="catalog-product">
                <div class="catalog-product-head">
                  <h4><a href="${escape(productHref(product))}"><span class="catalog-product-name">${text(selection.label ?? product.name)}</span></a></h4><strong>${escape(catalogPrice(product.price))}</strong>
                </div>
                <p>${text(selection.description ?? productDescription(product))}</p>${notes ? `
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

function contactActions({ phone = true, phoneName = false, classes = "", catalogOrder = false } = {}) {
  const actions = [
    ...(phone ? [{ href: "tel:+79166751452", label: "Позвонить", variant: "secondary", name: phoneName ? "Позвонить в лавку: +7 916 675‑14‑52" : "" }] : []),
    { href: "https://t.me/+79166751452", label: "Заказать в Телеграме", variant: "primary", channel: "Телеграме" },
    { href: "https://wa.me/79166751452", label: "Заказать в WhatsApp", variant: "primary", channel: "WhatsApp" },
  ];
  return actions.map(({ href, label, variant, name, channel }) => template("button", {
    href, label: text(label), variant, classes: classes ? ` ${classes}` : "",
    attributes: name ? ` aria-label="${text(name)}"` : "",
    labelAttributes: catalogOrder ? ` data-catalog-order-channel="${channel}"` : "",
  })).join("\n");
}

export const renderDeliveryActions = () => contactActions({ phoneName: true, classes: "delivery-source__order" });
export const renderCatalogOrderActions = () => contactActions({ phone: false, catalogOrder: true });

export function renderAboutPreview(root = "", shell = true, excerpt = false) {
  let html = template("about-preview", {
    root, shell: shell ? "source-shell " : "",
    action: template("button", {
      href: `${root}about/`, label: "О лавке и капитане", variant: "outline",
      classes: "", attributes: "", labelAttributes: "",
    }),
  });
  if (excerpt) {
    // The home page quotes the final paragraph; the complete story stays inside.
    const paragraphs = html.match(/^[ \t]*<p>[\s\S]*?<\/p>\n/gm);
    for (const paragraph of paragraphs.slice(0, -1)) html = html.replace(paragraph, "");
    html = html.replace(paragraphs.at(-1), paragraphs.at(-1).replace(/(<p>\s*)/, "$1«…"));
    html = html.replace("Как появилась лавка", "Олег о лавке");
  }
  return html;
}

const street = `${site.address.city}, ${site.address.street}`;
const metroDirections = `Метро ${site.address.metro}. Можно также дойти <span class="metro-route">от метро ${site.address.additionalMetro}.</span>`;
export const contactAddress = `${street}. ${metroDirections}`;

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
    menuActions: contactActions({ phoneName: true }),
    menuAddress: `${street}<br />\n                ${metroDirections}`,
  });
}

export function renderFooter(page, root) {
  const fallback = `    <nav class="site-navigation-fallback source-shell" id="site-navigation-fallback" aria-label="Разделы сайта" tabindex="-1" data-menu-fallback>
${routeLinks(page, root, false)}
    </nav>`;
  return `${fallback}\n${template("footer", {
    root, footerId: page === "catalog" ? "catalog-footer-title" : "footer-title",
    regularHours: `Каждый день с ${store.hours.open} до ${store.hours.close}`,
    footerAddress: `<span class="source-footer__address">${street}.</span> <span class="source-footer__directions">${metroDirections}</span>`,
    footerActions: contactActions({ classes: "source-button--footer-contact" }),
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
  return `    <script type="module" src="${root}assets/analytics.js"></script>`;
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

export function renderMobileHero() {
  const photos = JSON.parse(read("content/mobile-hero.json"))
    .filter(photo => currentSelections([photo.product]).length);
  const arrow = '<svg viewBox="0 0 32 18" aria-hidden="true" focusable="false"><use href="#icon-harpoon"></use></svg>';
  const prints = photos.map((photo, i) => {
    const { product } = resolveProduct(photo.product);
    if (!product.id) throw new Error(`Hero product needs a stable anchor: ${product.name}`);
    const href = productCatalogHref(photo.product, "", "afisha");
    const links = orderLinks(product);
    if (!photo.orderName) throw new Error(`Hero product needs an order label: ${product.name}`);
    const variants = media.filter(item => item.source === photo.image && item.width > 32);
    const { width, height } = variants.at(-1);
    let img = image({ ...photo, alt: text(photo.alt) }, "", "(max-width: 61.1875rem) calc(100vw - 60px), 1px", i > 0, true);
    if (i === 0) {
      // The full first photograph is needed only on mobile; the tiny fallback avoids a desktop download.
      const srcset = img.match(/srcset="([^"]+)"/)[1];
      img = `<picture><source media="(max-width: 61.1875rem)" srcset="${srcset}">${img.replace(/ srcset="[^"]+"/, "").replace(/src="[^"]+"/, `src="assets/${photo.image.replace(/\.jpg$/, "-32.webp")}"`)}</picture>`;
    }
    return `              <span class="afisha__print" style="--photo-ratio: ${width} / ${height}" data-position="${i}" data-caption="${text(product.name)}" data-category="${photo.product.category}" data-product-id="${product.id}" data-source="https://t.me/kapitanseledkin/${photo.id}" data-href="${escape(href)}" data-price="${escape(catalogPrice(product.price))}" data-order-label="${text(`Заказать ${photo.orderName}`)}" data-telegram="${escape(links.telegram)}" data-whatsapp="${escape(links.whatsapp)}"${i ? ' hidden aria-hidden="true"' : ""}>${img}</span>`;
  }).join("\n");
  const first = resolveProduct(photos[0].product).product;
  const firstHref = productCatalogHref(photos[0].product, "", "afisha");
  const firstOrder = orderLinks(first);
  return `          <div class="afisha" data-product-name="${text(first.name)}" data-product-category="${photos[0].product.category}" data-product-id="${first.id}" data-photo-index="1">
            <div class="afisha__brand brand-jelly brand-jelly--sea"><img src="assets/logo-redrawn-sea.svg" alt="Рыбная лавка капитана Селедкина" width="3600" height="1784"></div>
            <p class="afisha__title">Каче&shy;ствен&shy;ная рыба <em>на&nbsp;каж&shy;дый день,</em> море&shy;про&shy;дукты и&nbsp;рыбные дели&shy;ка&shy;тесы в&nbsp;Москве</p>
            <figure class="afisha__gallery">
              <a class="afisha__frame" href="${escape(firstHref)}" aria-label="Открыть ${text(photos[0].caption)} в каталоге">
${prints}
              </a>
              <figcaption>
                <div class="afisha__caption"><span class="afisha__name">${text(first.name)}</span><span class="afisha__price">${escape(catalogPrice(first.price))}</span></div><button class="afisha__change" type="button" hidden><span>Ещё из лавки</span><span class="afisha__count" aria-hidden="true">1/${photos.length}</span>${arrow}</button>
                <details class="afisha__order">
                  <summary><span class="afisha__order-label">${text(`Заказать ${photos[0].orderName}`)}</span></summary>
                  <div class="afisha__order-channels"><a class="afisha__order-telegram" href="${escape(firstOrder.telegram)}">В Телеграме</a><a class="afisha__order-whatsapp" href="${escape(firstOrder.whatsapp)}">В WhatsApp</a></div>
                </details>
              </figcaption>
              <span class="afisha__status" role="status" aria-live="polite"></span>
            </figure>
            <nav class="afisha__actions" aria-label="Основные действия">
              <a class="afisha__catalog" href="catalog/"><span>Каталог и цены</span>${arrow}</a>
            </nav>
          </div>`;
}

function journalBody(entry) {
  // Social hashtag rows are not site navigation. The archived source remains
  // unchanged; inline hashtags keep their words without the social prefix.
  const body = entry.body.replace(/<p class="journal-source-signature">[\s\S]*?<\/p>/g, "").replace(/<p\b[^>]*>([\s\S]*?)<\/p>/g, (paragraph, content) => {
    const visible = plain(content.replace(/<[^>]*>/g, "")).trim();
    return /^(?:#[\p{L}\p{N}_]+\s*)+$/u.test(visible) ? "" : paragraph;
  }).split(/(<[^>]*>)/g).map(part => part.startsWith("<") ? part
    : part.replace(/(^|[^\p{L}\p{N}_])#(?=[\p{L}])/gu, "$1")).join("");
  const lines = body.split("\n").filter(line => line.trim());
  const historical = recipes.some(recipe => recipe.id === entry.id)
    ? lines.findIndex(line => /Заказы принимаются только.*WhatsApp|class="journal-historical-contacts"/.test(line)) : -1;
  if (historical < 0) return lines.map(line => `                  ${line}`).join("\n");
  // Approved recipe presentation omits the old ordering/contact tail. The
  // archived source stays intact in content and remains linked from the page.
  return lines.slice(0, historical).map(line => `                  ${line}`).join("\n");
}

function journalTitle(value) {
  const hyphens = {
    Охлажденная: "Ох\u00adлаж\u00adденная", эталонная: "эта\u00adлонная", Карелии: "Ка\u00adре\u00adлии",
    малосольного: "мало\u00adсоль\u00adного", каспийского: "кас\u00adпий\u00adского", паштеты: "паш\u00adтеты",
    копченого: "коп\u00adче\u00adного", балтийского: "бал\u00adтий\u00adского", Диаметр: "Диа\u00adметр",
    тарелки: "та\u00adрелки", сантиметров: "сан\u00adти\u00adмет\u00adров",
    Рулетики: "Ру\u00adле\u00adти\u00adки", печенью: "пе\u00adченью",
    брюшков: "брюш\u00adков", осетра: "осет\u00adра", горячего: "горя\u00adчего", копчения: "коп\u00adчения",
  };
  return text(Object.entries(hyphens).reduce((title, [word, hyphenated]) => title.replaceAll(word, hyphenated), value));
}

// Editorial matches to current catalog positions; historical post prices are
// never used as selling prices. Stories without an exact match stay editorial.
export function renderHeroJournalProducts(list) {
  const products = list.flatMap((entry, index) => {
    if (!entry.heroOrderName) return [];
    const productId = entry.catalogProductIds?.[0];
    const orderName = entry.heroOrderName;
    const product = catalog.flatMap(category => category.items).find(item => item.id === productId);
    if (!product) {
      if (inventory.some(category => category.items.some(item => item.id === productId && item.price === null))) return [];
      throw new Error(`Missing hero journal product: ${productId}`);
    }
    const links = orderLinks(product);
    const panelId = `hero-journal-order-${entry.id}`;
    const price = escape(catalogPrice(product.price));
    const orderLabel = text(`Заказать по ${catalogPrice(product.price)}`);
    const orderMarkup = orderLabel.replace(price, `<span class="hero-journal-product__amount">${price}${harpoon}</span>`);
    return [`            <div class="hero-journal-product" data-hero-journal-product="${entry.id}" data-journal-id="${entry.id}"${index ? ' hidden inert aria-hidden="true"' : ""}>
              <button class="source-hero__journal-link hero-journal-product__toggle" type="button" popovertarget="${panelId}" aria-label="${text(`Заказать по ${catalogPrice(product.price)}. ${product.name}`)}" aria-expanded="false"><span>${orderMarkup}</span></button>
              <div class="hero-journal-product__choices" id="${panelId}" popover="auto" role="group" aria-label="${text(`Заказать ${orderName}`)}">
                <a class="source-button source-button--primary" href="${escape(links.telegram)}" data-hero-order-telegram><span class="source-button__label">В Телеграме</span></a>
                <a class="source-button source-button--primary" href="${escape(links.whatsapp)}" data-hero-order-whatsapp><span class="source-button__label">В WhatsApp</span></a>
                <a class="hero-journal-product__catalog" href="${escape(productHref(product, "", "hero-journal"))}">${text(`${product.name} в каталоге`)}</a>
                <label class="hero-journal-product__draft" hidden><span>Текст для сообщения</span><textarea readonly rows="6"></textarea></label>
                <p class="hero-journal-product__status" role="status"></p>
              </div>
            </div>`];
  }).join("\n");
  return `<div class="hero-journal-products">\n${products}\n</div>`;
}

export function renderJournal(list, view) {
  return list.map((entry, index) => {
    const { id, title } = entry;
    if (view === "hero") return `              <a class="source-hero__proof source-hero__journal-card" href="journal/${id}/" aria-label="Перейти к&nbsp;записи в&nbsp;журнале: ${title}"${index ? ' aria-hidden="true" tabindex="-1"' : ""} data-hero-journal-card data-entry-id="${id}" data-stack-position="${index}">
                <figure>
                  ${image(entry, "", "(max-width: 61.1875rem) 1px, (max-width: 100rem) 30vw, 480px", index > 0, true)}
                  <figcaption><span class="source-hero__proof-meta">Судовой журнал · <time datetime="${entry.date}">${date(entry, false)}</time></span><strong>${journalTitle(title)}</strong></figcaption>
                </figure>
              </a>`;
    if (view === "preview") return `            <a class="journal-preview__entry" href="journal/${id}/" aria-labelledby="journal-preview-${id}">
              <div class="journal-preview__media">
                ${image(entry, "", "(max-width: 22rem) calc(100vw - 36px), (max-width: 61.1875rem) min(32vw, 224px), 368px")}
              </div>
              <div class="journal-preview__copy">
                <time datetime="${entry.date}">${date(entry)}</time>
                <h3 id="journal-preview-${id}">${journalTitle(title)}</h3>
                <span class="journal-preview__link">Читать запись</span>
              </div>
            </a>`;
    if (view === "archive" || view === "earlier" || view === "search") {
      const root = "../";
      return `            <article class="journal-index-entry" id="journal-entry-${id}" tabindex="-1"${view === "search" ? ` data-journal-result data-search-text="${text(`${entry.title} ${entry.product}`)}" hidden` : ""}>
              <a class="journal-index-entry__link" href="${view === "search" ? "../journal/" : ""}${id}/" aria-labelledby="entry-title-${id}">
                ${image(entry, root, "(max-width: 61.1875rem) min(26vw, 192px), 192px")}
                <div>
                  <time datetime="${entry.date}">${date(entry)}</time>
                  <${view === "archive" ? "h2" : "h3"} id="entry-title-${id}">${journalTitle(title)}</${view === "archive" ? "h2" : "h3"}>
                  <span class="journal-index-entry__read">Читать запись</span>
                </div>
              </a>
            </article>`;
    }
    if (view !== "article") throw new Error(`Unknown journal view: ${view}`);
    const source = entry.source?.url ?? `https://t.me/kapitanseledkin/${id}`;
    const recipe = recipeForEntry(id);
    const kind = recipe ? (recipe.kind === "recipe" ? "Рецепт" : "Совет") : "Судовой журнал";
    const inquiry = `Здравствуйте! Подскажите, пожалуйста, есть ли в наличии:\n${entry.product}\n${recipe ? "Из материала Олега" : "Увидел(а) в Судовом журнале"}: ${source}`;
    const telegram = !entry.source || entry.source.name === "Телеграм";
    const archiveNote = entry.source?.excerpt
      ? `<p class="recipe-archive-note">Рецепт из авторской публикации Олега. <a href="${escape(source)}">Полный текст в ${text(entry.source.name)}</a>.</p>`
      : recipe ? `<p class="recipe-archive-note">Цены и условия в авторском тексте относятся к дате публикации. Действующие цены — <a href="../../catalog/">в каталоге</a>.</p>` : "";
    const actions = `<div class="ship-log-entry__actions">
      <a class="source-button source-button--telegram" href="https://t.me/+79166751452?text=${encodeURIComponent(plain(inquiry))}"><span class="source-button__label">Спросить о наличии<span class="visually-hidden"> в Телеграме: ${text(entry.product)}</span></span></a>
    </div>`;
    const reading = (body, { first = true, last = true, heading = "" } = {}) => `<div class="ship-log-entry__content">
      ${first && entry.imageCaption ? `<p class="source-caption">${text(entry.imageCaption)}</p>` : ""}${heading}${first ? archiveNote : ""}
      <div class="ship-log-entry__body">${body}</div>
      ${last ? renderCurrentCatalogContext(entry) + actions : ""}
    </div>`;
    const body = journalBody(entry);
    let story;
    if (recipe?.scenes) {
      const paragraphs = body.match(/<p\b[^>]*>[\s\S]*?<\/p>/g) ?? [];
      if (body.replace(/<p\b[^>]*>[\s\S]*?<\/p>/g, "").trim()
        || recipe.scenes.reduce((sum, scene) => sum + scene.paragraphs, 0) !== paragraphs.length) {
        throw new Error(`Story scenes must retain the full author text: ${id}`);
      }
      let cursor = 0;
      story = recipe.scenes.map((scene, index) => {
        const shot = scene.image ? scene : entry;
        const sectionBody = paragraphs.slice(cursor, cursor += scene.paragraphs).join("\n");
        return `<section class="journal-story__scene" aria-labelledby="story-${id}-scene-${index}">
          <figure>${image(shot, "../../", "(max-width: 61.1875rem) calc(100vw - 36px), 42vw", false, index === 0)}${scene.caption ? `<figcaption>${text(scene.caption)}</figcaption>` : ""}</figure>
          ${reading(sectionBody, { first: index === 0, last: index === recipe.scenes.length - 1,
            heading: `<h2 class="journal-story__scene-title" id="story-${id}-scene-${index}">${text(scene.title)}</h2>` })}
        </section>`;
      }).join("\n");
    } else {
      story = `${image(entry, "../../", "(max-width: 61.1875rem) calc(100vw - 36px), 42vw", false, true)}
        ${reading(body)}`;
    }
    return `            <article class="ship-log-entry journal-story${recipe?.scenes ? " journal-story--scenes" : ""}" data-journal-id="${id}" id="journal-entry-${id}" tabindex="-1">
              <header class="journal-story__header page-intro">
                <p class="page-intro__eyebrow">${kind} · Олег Гугунава</p>
                <h1 class="page-intro__title">${journalTitle(title)}</h1>
                <p class="ship-log-entry__meta"><time datetime="${entry.date}">${date(entry)}</time> <a class="ship-log-entry__source" href="${escape(source)}">${telegram ? '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="../../assets/social-icons.svg#telegram"></use></svg>' : ""}<span>${telegram ? "Из телеграм-канала" : `Из ${text(entry.source.name)}`}</span></a></p>
              </header>
              ${story}
            </article>`;
  }).join(view === "archive" ? "\n\n" : "\n");
}

// The selected Photoatlas is the entrance, not a replacement for the full archive.
// The data itself remains a manual editorial selection; no live channel feed.
export function renderJournalAtlas(list) {
  const recent = list.slice(0, 5);
  const earlier = list.slice(recent.length);
  const sizes = ["(max-width: 34rem) calc(100vw - 36px), (max-width: 52rem) 62vw, 55vw",
    "(max-width: 34rem) calc(100vw - 36px), (max-width: 52rem) 62vw, 31vw",
    "(max-width: 34rem) calc(100vw - 36px), (max-width: 52rem) 70vw, 31vw",
    "(max-width: 34rem) calc(100vw - 36px), (max-width: 52rem) 70vw, 40vw",
    "(max-width: 34rem) calc(100vw - 36px), (max-width: 52rem) calc(100vw - 36px), 62vw"];
  return `          <header class="journal-atlas__header">
            <div>
              <p class="page-intro__eyebrow">Записи Олега Гугунавы</p>
              <h1 class="page-intro__title" id="journal-title">Су­до­вой <em>жур­нал</em></h1>
            </div>
            <div class="journal-atlas__introduction">
              <p>${text("Пять последних записей. Рыба, детали, жизнь лавки — в авторском кадре.")}</p>
              ${earlier.length ? `<a class="editorial-link" href="#journal-earlier">Ранее в журнале${harpoon}</a>` : ""}
            </div>
          </header>
          <div class="journal-atlas__grid">
${recent.map((entry, index) => `            <article class="journal-index-entry atlas-record atlas-record--${index + 1}" id="journal-entry-${entry.id}" tabindex="-1">
              <a class="journal-index-entry__link" href="${entry.id}/" aria-labelledby="entry-title-${entry.id}" aria-describedby="entry-date-${entry.id}">
                <figure>
                  ${image(entry, "../", sizes[index], false, index === 0)}
                  <figcaption>
                    <time id="entry-date-${entry.id}" datetime="${entry.date}">${date(entry)}</time>
                    <h2 id="entry-title-${entry.id}">${journalTitle(entry.title)}</h2>
                    <span class="atlas-record__read">Читать запись${harpoon}</span>
                  </figcaption>
                </figure>
              </a>
            </article>`).join("\n")}
          </div>
${earlier.length ? `          <section class="journal-atlas__earlier" id="journal-earlier" aria-labelledby="journal-earlier-title" tabindex="-1">
            <header class="journal-atlas__archive-heading">
              <div><p class="page-intro__eyebrow">${text(`${earlier.length} более ранних записей`)}</p><h2 id="journal-earlier-title">Ранее в журнале</h2></div>
              <a class="editorial-link" href="#journal">К свежим записям${harpoon}</a>
            </header>
            <div class="ship-log__grid">
${renderJournal(earlier, "earlier")}
            </div>
          </section>` : ""}
          <aside class="journal-atlas__source" aria-label="Авторский канал">
            <p>${text("Поставки, рецепты и жизнь лавки — от самого капитана. Свежие записи — в телеграм-канале, ранние — на странице лавки в Facebook.")}</p>
            <a class="editorial-link" href="https://t.me/kapitanseledkin">Читать весь журнал в Телеграме${harpoon}</a>
            <a class="editorial-link" href="https://www.facebook.com/kapitanseledkin">Ранние записи в Facebook${harpoon}</a>
          </aside>`;
}

export function renderJournalPage(entry) {
  const recipe = recipeForEntry(entry.id);
  const section = recipe ? "recipes" : "journal";
  const sequence = recipe ? recipes.map(recipeEntry) : journalEntries;
  const url = `https://ks.fish/${editorialPath(entry.id)}`;
  const native = media.filter(item => item.source === entry.image).sort((a, b) => b.width - a.width)[0];
  const index = sequence.findIndex(item => item.id === entry.id);
  const harpoon = `<svg viewBox="0 0 32 18" aria-hidden="true" focusable="false"><path d="M23 9H8.5C4.6 9 2.5 10.8 2.5 13.2c0 2.1 1.7 3.4 3.7 2.6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" /><path d="M19.5 3 30 9l-10.5 6 3.1-6-3.1-6Z" fill="currentColor" /></svg>`;
  const neighbors = [sequence[index + 1], sequence[index - 1]].filter(Boolean).map(item => {
    const previous = sequence.indexOf(item) > index;
    const label = previous ? `${harpoon}${recipe ? "Предыдущий материал" : "Предыдущая запись"}` : `${recipe ? "Следующий материал" : "Следующая запись"}${harpoon}`;
    return `<a href="../${item.id}/" rel="${previous ? "prev" : "next"}"><span class="journal-story__direction">${label}</span><span class="journal-story__neighbor-title">${item.title}</span></a>`;
  }).join("\n");
  return template("journal-page", {
    theme: renderTheme(section), analytics: renderAnalytics("../../"), menu: renderMenu(section, "../../"), footer: renderFooter(section, "../../"),
    article: renderJournal([entry], "article") + renderEditorialContext(entry), neighbors,
    sectionLabel: recipe ? "Рецепты и советы" : "Судовой журнал",
    backLabel: recipe ? "Все рецепты и советы" : "Все записи журнала",
    neighborsLabel: recipe ? "Другие рецепты и советы" : "Другие записи журнала",
    skipLabel: recipe ? (recipe.kind === "recipe" ? "Перейти к рецепту" : "Перейти к совету") : "Перейти к записи",
    url, title: text(entry.title), description: text(`${plain(entry.title).replace(/[.!?]+$/u, "")}. ${recipe ? (recipe.kind === "recipe" ? "Рецепт" : "Совет") : "Запись"} Олега Гугунавы от ${date(entry)}. Рыбная лавка капитана Селедкина.`),
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
  if (product.price === null) return "";
  const related = includeRecipe ? productRecipeLinks(category, product).find(recipe => recipe.kind === "recipe") : null;
  return `<article class="meal-product">
      <${heading}><a href="${escape(productCatalogHref(selection, root))}">${text(product.name)}</a></${heading}>
      <p>${text(productDescription(product) || category.label)}</p>
      <strong>${escape(catalogPrice(product.price))}</strong>
      ${related ? `<a class="editorial-link" href="${root}recipes/${related.id}/">${text(related.title)}${harpoon}</a>` : ""}
    </article>`;
}

function currentCatalogContext(products, label, headingId) {
  products = currentSelections(products);
  if (!products.length) return "";
  return `<section class="recipe-current" aria-labelledby="${headingId}">
    <h2 id="${headingId}">${label}</h2>
    <div class="meal-products">${products.map(selection => currentProduct(selection, "../../", "h3", false)).join("\n")}</div>
  </section>`;
}

function renderCurrentCatalogContext(entry) {
  const recipe = recipes.find(item => item.id === entry.id);
  if (!recipe) {
    const source = entry.source?.url ?? `https://t.me/kapitanseledkin/${entry.id}`;
    const products = catalog.flatMap(category => category.items
      .filter(product => entry.catalogProductIds?.includes(product.id) || product.source === source)
      .map(product => ({ category: category.slug, name: product.name, description: product.description })));
    return currentCatalogContext(products, "Из этой записи", "journal-current-title");
  }
  return currentCatalogContext(recipe.products,
    recipe.kind === "recipe" ? "Для этого рецепта" : "В рассказе Олега", "recipe-current-title");
}

function renderEditorialContext(entry) {
  const recipe = recipeForEntry(entry.id);
  if (!recipe) return "";
  const sequence = recipe.sequence?.map(shot => `<figure class="recipe-sequence">
    ${image(shot, "../../", "(max-width: 61.1875rem) calc(100vw - 36px), 640px")}
    <figcaption>${text(shot.caption)}</figcaption>
  </figure>`).join("\n") ?? "";
  return `\n${sequence}${recipe.videoSource ? `<p class="recipe-video-source"><a class="editorial-link" href="${recipe.videoSource}">Смотреть авторское видео в Телеграме${harpoon}</a></p>` : ""}`;
}

function recipeEditorialItem(recipe) {
  recipe = { ...recipe, products: currentSelections(recipe.products) };
  const item = recipeContent.editorial.find(item => item.id === recipe.id) ?? {};
  const entry = recipeEntry(recipe);
  const excerpt = recipe.excerpt ?? [item.excerpt];
  const normalized = value => plain(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  for (const quote of [item.pull, ...excerpt].filter(Boolean)) {
    if (!normalized(entry.body).includes(normalized(quote))) throw new Error(`Editorial quote differs from Oleg's source: ${recipe.id}`);
  }
  if (!excerpt.length || excerpt.some(paragraph => !paragraph)) throw new Error(`Missing recipe excerpt: ${recipe.id}`);
  return { ...item, id: recipe.id, recipe, entry, excerpt, products: recipe.products.map(selection => resolveProduct(selection).product) };
}

function recipeFeature(root, heading = "h3") {
  const { recipe, entry, excerpt, products } = recipeEditorialItem(recipes[0]);
  return `<article class="recipe-feature" aria-labelledby="recipe-feature-title">
    <a class="recipe-feature__photo" href="${root}recipes/${entry.id}/" aria-label="${recipe.kind === "advice" ? "Совет" : "Рецепт"}: ${text(recipe.title)}">${image(entry, root, "(max-width: 61.1875rem) calc(100vw - 36px), 520px")}</a>
    <div class="recipe-feature__copy">
      <p class="recipe-meta"><time datetime="${entry.date}">${date(entry)}</time></p>
      <${heading} id="recipe-feature-title">${text(recipe.title)}</${heading}>
      <blockquote>${excerpt.map(paragraph => `<p>${text(paragraph)}</p>`).join("")}</blockquote>
      <a class="editorial-link" href="${root}recipes/${entry.id}/">${recipe.kind === "advice" ? "Читать совет" : "Приготовить по рецепту"}${harpoon}</a>
      ${recipe.products.map((selection, index) => `<a class="editorial-link recipe-feature__catalog" href="${escape(productCatalogHref(selection, root))}">${text(products[index].name)} в каталоге${harpoon}</a>`).join("")}
    </div>
  </article>`;
}

function recipeTitle(title) {
  const wordBreaks = { "секретов": "секре­тов", "сковороде": "ско­во­ро­де", "томатном": "то­мат­ном", "Осьминог": "Ось­ми­ног", "Патагонские": "Пата­гон­ские", "Перепелиные": "Пере­пе­ли­ные", "креветочной": "кре­ве­точной", "креветки": "кре­вет­ки", "креветку": "кре­вет­ку", "белобрюшка": "бело­брюш­ка", "Командир": "Коман­дир", "счастливой": "счаст­ливой", "Предельно": "Пре­дель­но", "упаковка": "упа­ков­ка", "разделать": "раз­делать" };
  return Object.entries(wordBreaks).reduce((result, [word, hyphenated]) => result.replaceAll(word, hyphenated), text(title));
}

export function renderRecipeHome() {
  return `<header class="watch-catch__header">
    <h2 id="watch-catch-title">Рецепты и советы Олега</h2>
    <a class="editorial-link" href="recipes/">Все рецепты и советы${harpoon}</a>
  </header>
  ${recipeFeature("")}
  <ul class="watch-catch__list">${recipes.slice(1, 4).map(recipe => {
    const { id } = recipe;
    const entry = recipeEntry(recipe);
    return `<li class="watch-catch__item"><a href="recipes/${id}/" aria-label="${text(recipe.title)}"><span class="watch-catch__photo">${image(entry, "", "(max-width: 1257px) 88px, (max-width: 1714px) 7vw, 120px")}</span><span class="watch-catch__caption"><span class="watch-catch__name">${recipeTitle(recipe.title)}</span>${harpoon}</span></a></li>`;
  }).join("\n")}</ul>
  <p class="watch-catch__all"><a class="editorial-link" href="recipes/">Все рецепты и советы${harpoon}</a></p>`;
}

function renderRecipeEditorial(root) {
  const selected = recipeOpening.map(recipeEditorialItem);
  const kind = item => item.recipe.kind === "advice" ? "совет" : "рецепт";
  const meta = item => `<p class="recipe-meta">${item.recipe.kind === "advice" ? "Совет" : "Рецепт"} Олега · <time datetime="${item.entry.date}">${date(item.entry)}</time></p>`;
  const title = item => `<h2 id="recipe-editorial-${item.id}"><a href="${root}recipes/${item.id}/">${item.noun && item.ending ? `${text(item.noun)} <em>${text(item.ending)}</em>` : text(item.recipe.title)}</a></h2>`;
  const photoLink = (item, photo) => `<a class="recipe-editorial-photo-link" href="${root}recipes/${item.id}/" aria-label="Читать ${kind(item)}: ${text(item.recipe.title)}">${photo}</a>`;
  const actions = item => `<div class="recipe-editorial-actions"><a class="editorial-link" href="${root}recipes/${item.id}/" aria-label="Читать ${kind(item)}: ${text(item.recipe.title)}">Читать ${kind(item)}${harpoon}</a></div>`;
  const product = item => item.products.map((product, index) => `<div class="recipe-editorial-product"><p class="recipe-editorial-product__label">${item.recipe.kind === "advice" ? "В совете Олега" : "Для этого рецепта"}</p><div class="recipe-editorial-product__head"><a class="recipe-record-product recipe-editorial-product__link" data-recipe-id="${item.id}" href="${escape(productCatalogHref(item.recipe.products[index], root))}"><span class="recipe-record-product__label recipe-editorial-product__name"><span class="recipe-record-product__name">${text(product.name)}</span></span><span class="recipe-record-product__price"><strong>${escape(catalogPrice(product.price)).replace("/", "<wbr>/")}</strong>${harpoon}</span></a></div>${product.description ? `<p class="recipe-editorial-product__origin">${text(product.description)}</p>` : ""}</div>`).join("");
  const pull = item => item.pull ? `<blockquote class="recipe-editorial-pull"><p>«${text(item.pull)}»</p></blockquote>` : "";
  const excerpt = item => item.excerpt.map(paragraph => `<p>${text(paragraph)}</p>`).join("");
  const [lead, ...pair] = selected;
  return `<div class="recipe-editorial-opening">
    <article class="recipe-feature recipe-editorial-lead" data-recipe-feature="${lead.id}" data-ingredient-group="${lead.recipe.ingredient}" aria-labelledby="recipe-editorial-${lead.id}">
      <div class="recipe-editorial-lead__heading">${meta(lead)}${title(lead)}${pull(lead)}</div>
      <figure class="recipe-feature__photo recipe-editorial-lead__photo">${photoLink(lead, image(lead.entry, root, "(max-width: 46rem) calc(100vw - 36px), 58vw", false, true))}<figcaption>Фотография Олега к ${lead.recipe.kind === "advice" ? "совету" : "рецепту"}</figcaption></figure>
      <div class="recipe-editorial-lead__note">${excerpt(lead)}${product(lead)}${actions(lead)}</div>
    </article>
    <div class="recipe-editorial-pair">${pair.map(item => `<article class="recipe-editorial-story" data-recipe-feature="${item.id}" data-ingredient-group="${item.recipe.ingredient}" aria-labelledby="recipe-editorial-${item.id}">
      <figure>${photoLink(item, image(item.entry, root, "(max-width: 46rem) calc(100vw - 36px), 46vw"))}</figure>
      <div class="recipe-editorial-story__copy">${meta(item)}${title(item)}${pull(item)}${excerpt(item)}${product(item)}${actions(item)}</div>
    </article>`).join("\n")}</div>
  </div>`;
}

export function renderRecipesPage() {
  const featuredIds = new Set(recipeOpening.map(item => item.id));
  const chooser = `<section class="recipe-chooser" aria-labelledby="recipe-chooser-title" data-recipe-chooser hidden>
    <h2 id="recipe-chooser-title">Из чего готовим?</h2>
    <div class="recipe-ingredients" role="group" aria-label="Выбрать продукт">${recipeIngredients.map(([slug, label]) => `<button type="button" data-ingredient="${slug}" aria-pressed="${slug === "all"}">${label}<span>${slug === "all" ? recipes.length : recipes.filter(recipe => recipe.ingredient === slug).length}</span></button>`).join("")}</div>
    <p class="recipe-filter-status" role="status" aria-live="polite" data-recipe-filter-status>${countNoun(recipes.filter(recipe => recipe.kind === "recipe").length, ["рецепт", "рецепта", "рецептов"])} и ${countNoun(recipes.filter(recipe => recipe.kind === "advice").length, ["совет", "совета", "советов"])}</p>
  </section>`;

  const groups = `<section class="recipe-directory recipe-directory--editorial" aria-label="Авторские развороты" data-recipe-opening>
    ${renderRecipeEditorial("../")}
  </section>
  <section class="recipe-record-directory" id="recipes" aria-labelledby="recipes-title">
    <header class="recipe-record-heading"><h2 id="recipes-title" data-recipe-directory-title>Рецепты и советы</h2></header>
    <div class="recipe-records">${recipes.map(recipe => {
      const entry = recipeEntry(recipe);
      const normalized = value => plain(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      const editorialExcerpt = recipeContent.editorial.find(item => item.id === recipe.id)?.excerpt;
      const excerpt = recipe.excerpt ?? (editorialExcerpt ? [editorialExcerpt] : []);
      if (!featuredIds.has(recipe.id) && !excerpt.length) throw new Error(`Missing recipe excerpt: ${recipe.id}`);
      for (const paragraph of excerpt) {
        if (!normalized(entry.body).includes(normalized(paragraph))) throw new Error(`Recipe excerpt differs from Oleg's source: ${recipe.id}`);
      }
      const buying = currentSelections(recipe.products).map(selection => {
        const { product } = resolveProduct(selection);
        return `<a class="recipe-record-product" data-recipe-id="${recipe.id}" href="${escape(productCatalogHref(selection, "../"))}"><span class="recipe-record-product__label"><span class="recipe-record-product__name">${text(product.name)}</span></span><span class="recipe-record-product__price">${escape(catalogPrice(product.price)).replace("/", "<wbr>/")}${harpoon}</span></a>`;
      }).join("");
      return `<article class="recipe-record"${recipe.id === 453 ? ' id="advice"' : ""} data-recipe-material="${recipe.id}" data-ingredient-group="${recipe.ingredient}" data-kind="${recipe.kind}"${featuredIds.has(recipe.id) ? ' data-featured hidden' : ""} aria-labelledby="recipe-title-${recipe.id}">
        <a class="recipe-record-photo" href="${recipe.id}/" aria-label="${recipe.kind === "advice" ? "Читать совет" : "Читать рецепт"}: ${text(recipe.title)}">${image(entry, "../", "(max-width: 46rem) calc(100vw - 36px), (max-width: 1440px) 42vw, 580px")}</a>
        <div class="recipe-record-copy"><p class="recipe-record-meta">${recipe.kind === "advice" ? "Совет" : "Рецепт"} Олега · <time datetime="${entry.date}">${date(entry)}</time></p>
        <a class="recipe-record-story" href="${recipe.id}/" aria-labelledby="recipe-title-${recipe.id}"><h3 id="recipe-title-${recipe.id}">${recipeTitle(recipe.title)}</h3></a>
        <div class="recipe-record-excerpt">${excerpt.map(paragraph => `<p>${text(paragraph)}</p>`).join("")}</div>
        <a class="editorial-link recipe-record-read" href="${recipe.id}/">${recipe.kind === "advice" ? "Читать совет" : "Читать рецепт"}${harpoon}</a>
        ${buying ? `<div class="recipe-record-products">${buying}</div>` : ""}</div>
      </article>`;
    }).join("\n")}</div>
  </section>`;
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
    chooser, groups, collections, aboutPreview: renderAboutPreview("../", false),
    recipeJump: [["recipes-title", "Ещё рецепты и советы"], ["meals", "Что купить к ужину"]]
      .map(([id, label]) => `<a href="#${id}">${label}${harpoon}</a>`).join(""),
  }).replace(/[ \t]+$/gm, "") + "\n";
}

export function renderAssortmentMedia() {
  const shots = [
    { category: "caviar", ...entries.find(entry => entry.id === 681), caption: "Икра дикого кижуча" },
    { category: "seafood", ...recipeEntry(recipes.find(r => r.id === 412)), caption: "Северные креветки" },
    { category: "chilled-fish", ...entries.find(entry => entry.id === 699), caption: "Охлаждённая форель из Карелии" },
    // Oleg's frozen catch after defrosting: https://t.me/kapitanseledkin/679.
    { category: "frozen-fish", image: "journal-679.jpg", alt: "Мурманская пятнистая камбала после размораживания на деревянной доске рядом с ножом", caption: "Мурманская пятнистая камбала" },
    { category: "fillet", image: "gallery-small-1.jpg", alt: "Коробка филе трески судовой заморозки", caption: "Филе трески судовой заморозки" },
    { category: "steaks", ...entries.find(entry => entry.id === 693), caption: "Стейки лосося" },
    { category: "prepared-fish", ...entries.find(entry => entry.id === 695), caption: "Форель холодного копчения" },
    { category: "canned", ...entries.find(entry => entry.id === 687), caption: "Уха в банках" },
    // Full author photograph: https://www.facebook.com/photo/?fbid=6102000469850617&set=a.2062052130512158.
    { category: "grocery", image: "assortment-sesame-oil-2023.jpg", alt: "Бутылочка корейского кунжутного масла на столе в лавке", caption: "Корейское кунжутное масло" },
    { category: "shop", image: "delivery-basket.jpg", alt: "Рыба, икра, консервы и соусы лавки в плетёной корзине", caption: "Корзина с продуктами лавки" },
  ];
  return shots.map((shot, index) => `<figure class="assortment-overview__media" data-assortment-photo="${shot.category}"${index ? " hidden" : ""}>
    ${image(shot, "", "(max-width: 61.1875rem) calc(100vw - 36px), 520px", index > 0)}
    <figcaption>${text(shot.caption)}</figcaption>
  </figure>`).join("\n");
}

export function renderAssortmentDirectory() {
  return catalog.filter(category => category.showOnHome !== false).map(category => `                <li>
                  <a class="assortment-directory__link" href="catalog/#category-${category.slug}">
                    <span class="assortment-directory__label">${text(category.label)}</span>
                    <span class="assortment-directory__meta">${positionCount(groupCatalogProducts(category.items).length)}<svg class="harpoon-mark" viewBox="0 0 32 18" aria-hidden="true" focusable="false"><use href="#icon-harpoon" /></svg></span>
                  </a>
                </li>`).join("\n");
}

export function renderAudioLibrary() {
  return `<section class="founder-source__library source-shell" aria-labelledby="oleg-audio-title">
            <header class="founder-source__library-header">
              <h3 id="oleg-audio-title">Архив радиоэфиров</h3>
              <p>Олег о рыбе и морепродуктах в программе «Провиант» на радио «Говорит Москва».</p>
              <p class="source-caption">Записи опубликованы на SoundCloud в январе 2021 года. Цены и сообщения о поставках относятся ко времени эфиров.</p>
            </header>
            <ul>${olegSources.audio.map(audio => `<li id="audio-${audio.id}">
                <div class="founder-source__episode">
                  <h4><a class="founder-source__source-link" href="${escape(audio.url)}">${text(audio.label)}</a></h4>
                  <p class="source-caption">${text(`${Math.floor(audio.durationSeconds / 60)} мин ${audio.durationSeconds % 60} с`)}</p>
                  <p>${text(audio.summary)}</p>
                </div>
                <div class="founder-source__chapters" aria-label="Темы эфира «${escape(audio.label)}»">${audio.chapters.map(chapter => `<a class="founder-source__source-link" href="${escape(audioFragmentHref(audio, chapter))}"><span>${text(chapter.label)}</span><span class="source-caption">${audioTime(chapter.start)}</span></a>`).join("\n                  ")}</div>
              </li>`).join("\n              ")}</ul>
            <p class="founder-source__channels">Другие записи с Олегом — на <a href="https://www.youtube.com/channel/UCPc0ClmcBq3GXT2FAmMQy7A/videos">YouTube</a> и <a href="https://soundcloud.com/kapitanseledkin">SoundCloud</a>.</p>
          </section>`;
}
