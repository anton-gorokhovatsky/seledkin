import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const folder = fileURLToPath(new URL("./", import.meta.url));
const home = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
// Preserve the old authored presentation after the selected version reaches home.
const baseline = readFileSync(new URL("./00-current/index.html", import.meta.url), "utf8");
const original = baseline.match(/<section class="delivery-source"[\s\S]*?<\/section>/)?.[0];
const current = home.match(/<section class="delivery-source(?: [^"]+)?"[\s\S]*?<\/section>/)?.[0];
if (!original) throw new Error("Missing accepted delivery section");
if (!current) throw new Error("Missing production delivery section");
const photo = original.match(/<img[\s\S]*?\/>/)[0];
const lead = original.match(/<p class="delivery-source__lead">([\s\S]*?)<\/p>/)[1];
const terms = original.match(/<p class="delivery-source__terms">([\s\S]*?)<\/p>/)[1];
const actions = current.match(/<div class="delivery-source__actions">([\s\S]*?)<\/div>/)[1];
const harpoon = '<svg viewBox="0 0 32 18" aria-hidden="true" focusable="false"><path d="M23 9H8.5C4.6 9 2.5 10.8 2.5 13.2c0 2.1 1.7 3.4 3.7 2.6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"/><path d="M19.5 3 30 9l-10.5 6 3.1-6-3.1-6Z" fill="currentColor"/></svg>';
const footer = `<div class="delivery-study__finish"><div class="delivery-source__actions">${actions}</div><a class="editorial-link" href="#contacts">Или забрать в лавке${harpoon}</a></div>`;
const waybill = `<section class="delivery-study delivery-waybill" id="delivery" aria-labelledby="delivery-title">
  <div class="delivery-waybill__copy">
  <header class="delivery-study__heading"><p class="delivery-study__eyebrow">Из лавки — к вашему столу</p><h2 id="delivery-title">Дос­тавка <em>домой или в офис</em></h2></header>
  <div class="delivery-waybill__receipt"><p class="delivery-waybill__price">490<span> ₽</span></p><dl><div><dt>Куда</dt><dd>Москва, в пределах МКАД</dd></div><div><dt>Когда</dt><dd>В течение двух часов</dd></div><div><dt>Сумма заказа</dt><dd>Без ми­ни­мальной суммы</dd></div></dl></div>
  ${footer}</div>
  <figure>${photo}<figcaption>Корзина с продуктами лавки</figcaption></figure>
</section>`;
const path = `<section class="delivery-study delivery-path" id="delivery" aria-labelledby="delivery-title">
  <header class="delivery-study__heading"><p class="delivery-study__eyebrow">От выбора до доставки</p><h2 id="delivery-title">Доставка <em>в три шага</em></h2><p>${lead}</p></header>
  <div class="delivery-path__body"><figure>${photo}<figcaption>Корзина с продуктами лавки</figcaption></figure><ol class="delivery-path__steps"><li><span class="delivery-path__number" aria-hidden="true">01</span><div><h3>Выберите рыбу</h3><p>Добавьте продукты в список заказа и укажите вес или количество упаковок.</p><a class="editorial-link" href="catalog/">Собрать список${harpoon}</a></div></li><li><span class="delivery-path__number" aria-hidden="true">02</span><div><h3>Пришлите список</h3><p>В Телеграме или WhatsApp уточним наличие и договоримся о заказе.</p><div class="delivery-source__actions">${actions}</div></div></li><li><span class="delivery-path__number" aria-hidden="true">03</span><div><h3>Встречайте доставку</h3><p>${terms}</p><a class="editorial-link" href="#contacts">Или забрать в лавке${harpoon}</a></div></li></ol></div>
</section>`;

for (const [slug, section] of [["00-current", original], ["01-waybill", waybill], ["02-path", path]]) {
  let html = home.replace(current, section)
    .replace(/<link rel="canonical"[^>]+>/, '<meta name="robots" content="noindex,nofollow">')
    .replace(/<script type="module" src="assets\/analytics.js"><\/script>/, "")
    .replace(/\b(src|href|poster|data-source-image|data-logo-light|data-logo-dark|data-poster-light|data-poster-dark)="((?:assets|catalog|journal|about|recipes)\/[^\"]*)"/g, '$1="/$2"')
    .replace(/srcset="([^\"]+)"/g, (_, sources) => `srcset="${sources.replace(/(?<!\/)\bassets\//g, "/assets/")}"`)
    .replace(/posterPreload.href = isDark \? "assets\//, 'posterPreload.href = isDark ? "/assets/')
    .replace(/: "assets\/hero-sea-poster.webp"/, ': "/assets/hero-sea-poster.webp"')
    .replace(/(["'])assets\//g, "$1/assets/")
    .replace('</head>', '<link rel="stylesheet" href="/experiments/delivery-2026-10-11/styles.css"><script>const previewTheme=new URLSearchParams(location.search).get("theme");if(previewTheme==="light"||previewTheme==="dark"){document.documentElement.dataset.theme=previewTheme;document.documentElement.dataset.themeSource="explicit";document.documentElement.style.colorScheme=previewTheme;}</script></head>')
    .replace('</body>', '<script type="module" src="/experiments/delivery-2026-10-11/preview.js"></script></body>')
    .replace(/[ \t]+\n/g, "\n");
  mkdirSync(`${folder}${slug}`, { recursive: true });
  writeFileSync(`${folder}${slug}/index.html`, html);
}
