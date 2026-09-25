import { readFileSync } from "node:fs";
import { typographText } from "../assets/typography.js";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const site = JSON.parse(read("content/site.json"));
const media = JSON.parse(read("assets/media-variants.json"));
export const entries = JSON.parse(read("content/journal.json")).map(entry => ({
  ...entry,
  body: read(`content/journal/${entry.id}.html`).trim(),
}));

const escape = value => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const text = value => escape(typographText(value));
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
    menuAddress: `${street}<br />\n                Метро ${site.address.metro}`,
  });
}

export function renderFooter(page, root) {
  const fallback = `    <nav class="site-navigation-fallback source-shell" id="site-navigation-fallback" aria-label="Разделы сайта" tabindex="-1" data-menu-fallback>
${routeLinks(page, root, false)}
    </nav>`;
  return `${fallback}\n${template("footer", {
    root, footerId: page === "catalog" ? "catalog-footer-title" : "footer-title",
    footerAddress: `${street}; ${metro}`,
  })}`;
}

export function renderTheme(page) {
  return template("theme-bootstrap", {
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
    if (view === "hero") return `              <a class="source-hero__proof source-hero__journal-card" href="journal/#journal-entry-${id}" aria-label="Перейти к&nbsp;записи в&nbsp;журнале: ${title}"${index ? ' aria-hidden="true" tabindex="-1"' : ""} data-hero-journal-card data-stack-position="${index}">
                <figure>
                  ${image(entry, "", "(max-width: 61.1875rem) min(88vw, 340px), 288px", index > 0, true)}
                  <figcaption><span class="source-hero__proof-meta"><time datetime="${entry.date}">${date(entry, false)}</time></span><strong>${title}</strong></figcaption>
                </figure>
              </a>`;
    if (view === "preview") return `            <a class="journal-preview__entry" href="journal/#journal-entry-${id}" aria-labelledby="journal-preview-${id}">
              <div class="journal-preview__media">
                ${image(entry, "", "(max-width: 22rem) calc(100vw - 36px), (max-width: 61.1875rem) min(28vw, 128px), 368px")}
              </div>
              <div class="journal-preview__copy">
                <time datetime="${entry.date}">${date(entry)}</time>
                <h3 id="journal-preview-${id}">${title}</h3>
                <span class="journal-preview__link">Читать запись</span>
              </div>
            </a>`;
    if (view !== "archive") throw new Error(`Unknown journal view: ${view}`);
    const source = `https://t.me/kapitanseledkin/${id}`;
    const inquiry = `Здравствуйте! Подскажите, пожалуйста, есть ли в наличии:\n${entry.product}\nУвидел(а) в Судовом журнале: ${source}`;
    return `            <article class="ship-log-entry" id="journal-entry-${id}" tabindex="-1">
              ${image(entry, "../", `(max-width: 61.1875rem) calc(100vw - 36px), ${entry.archiveImageWidth}px`)}
              <div class="ship-log-entry__content">
                <p class="ship-log-entry__meta"><time datetime="${entry.date}">${date(entry)}</time> <span>Запись №&nbsp;${id}</span></p>
                <h2>${title}</h2>
                <div class="ship-log-entry__body">
${entry.body.split("\n").map(line => `                  ${line}`).join("\n")}
                </div>
                <div class="ship-log-entry__actions">
                  <a class="source-button source-button--telegram" href="https://t.me/+79166751452?text=${encodeURIComponent(inquiry)}"><span class="source-button__label">Спросить о наличии<span class="visually-hidden"> в Телеграме: ${text(entry.product)}</span></span></a>
                  <a class="ship-log-entry__link" href="${source}">Читать запись в Телеграме</a>
                </div>
              </div>
            </article>`;
  }).join(view === "archive" ? "\n\n" : "\n");
}
