import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { catalog } from "../assets/catalog-data.js";
import {
  effectiveTheme,
  normalizeTheme,
  themeStorageKey,
} from "../assets/theme.js";
import { typographPrice, typographText } from "../assets/typography.js";

const home = await readFile(new URL("../index.html", import.meta.url), "utf8");
const catalogPage = await readFile(
  new URL("../catalog/index.html", import.meta.url),
  "utf8",
);
const notFoundPage = await readFile(
  new URL("../404.html", import.meta.url),
  "utf8",
);
const accessibility = await readFile(
  new URL("../ACCESSIBILITY.md", import.meta.url),
  "utf8",
);
const styles = await readFile(
  new URL("../assets/styles.css", import.meta.url),
  "utf8",
);
const siteScript = await readFile(
  new URL("../assets/site.js", import.meta.url),
  "utf8",
);
const catalogScript = await readFile(
  new URL("../catalog/catalog.js", import.meta.url),
  "utf8",
);

function relativeLuminance(hex) {
  const channels = hex
    .replace("#", "")
    .match(/../g)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    );

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground, background) {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

test("the site is plain HTML, CSS and JavaScript", () => {
  assert.match(home, /^<!doctype html>/i);
  assert.match(catalogPage, /^<!doctype html>/i);
  assert.doesNotMatch(home + catalogPage + siteScript, /next\/|react-dom|hydrateRoot/i);
  assert.match(home, /assets\/styles\.css/);
  assert.match(catalogPage, /catalog\.js/);
});

test("home exposes the core customer jobs", () => {
  for (const id of ["assortment", "about", "delivery", "contacts"]) {
    assert.match(home, new RegExp(`id="${id}"`));
  }

  assert.match(home, /Продукты и цены/);
  assert.match(home, /Заказать в Телеграме/);
  assert.match(home, /метро «Вавиловская»/);
  assert.ok(home.indexOf("Вавиловская") < home.indexOf("Университет"));
  assert.match(home, /Ежедневно с 11:00 до 20:00/);
});

test("the desktop header is compact, edge-to-edge and leaves navigation to the menu", () => {
  for (const page of [home, catalogPage]) {
    assert.match(page, /class="source-header__bar"/);
    assert.match(page, /class="source-header__note"/);
    assert.match(page, /Метро «Вавиловская» — ежедневно, с&nbsp;11:00 до&nbsp;20:00/);
    assert.doesNotMatch(
      page,
      /source-header__top|source-header__address|source-header__action|source-navigation|theme-toggle--header/,
    );
  }

  assert.match(styles, /\.source-header\s*\{[\s\S]*?min-height:\s*7rem;/);
  assert.match(styles, /\.source-header__bar\s*\{[\s\S]*?width:\s*100%;/);
  assert.match(
    styles,
    /grid-template-columns:\s*10rem minmax\(0, 1fr\) 10rem/,
  );
  assert.doesNotMatch(
    styles,
    /\.source-header__top|\.source-header__address|\.source-header__action|\.source-navigation|\.theme-toggle--header/,
  );
});

test("home keeps the source ks.fish visual sequence and local imagery", () => {
  const sequence = [
    "source-header",
    "source-hero",
    "opening-story",
    "fish-divider",
    "source-section--story",
    "source-gallery",
    "full-photo",
    "source-quote",
    "founder-source",
    "price-preview",
    "ship-log",
    "delivery-source",
    "contacts-source",
    "source-footer",
  ];

  let cursor = -1;
  for (const marker of sequence) {
    const next = home.indexOf(marker, cursor + 1);
    assert.ok(next > cursor, `Секция ${marker} должна идти в исходном порядке`);
    cursor = next;
  }

  for (const asset of [
    "hero-ocean.jpg",
    "caviar-slab.jpg",
    "salmon-dish.jpg",
    "fish-pattern.svg",
    "about-main.jpg",
    "cutting-tuna.jpg",
    "quote-pan.jpg",
    "oleg-gugunava.jpg",
    "delivery-basket.jpg",
  ]) {
    assert.match(home, new RegExp(`assets/${asset.replace(".", "\\.")}`));
  }

  assert.doesNotMatch(home, /Feed not found|уточняйте цены|Друзья!/i);
  assert.doesNotMatch(home + catalogPage + styles, /tildacdn\.com/i);
  assert.doesNotMatch(home + catalogPage + styles, /fish-divider\.png/i);
  assert.match(styles, /fish-pattern\.svg/);
  assert.match(styles, /"Iowan Old Style"/);
});

test("the Ship's Log is a manual, attributed selection of the latest posts", () => {
  assert.match(home, /id="journal"/);
  assert.match(home, /<h2 id="journal-title">Судовой журнал<\/h2>/);
  assert.equal((home.match(/<article class="ship-log-entry">/g) ?? []).length, 4);
  assert.match(home, /https:\/\/t\.me\/kapitanseledkin"/);

  let cursor = -1;
  for (const id of [682, 681, 680, 679]) {
    const next = home.indexOf(`https://t.me/kapitanseledkin/${id}`, cursor + 1);
    assert.ok(next > cursor, `Запись ${id} должна идти в обратной хронологии`);
    assert.match(home, new RegExp(`assets/journal-${id}\\.jpg`));
    cursor = next;
  }

  for (const excerpt of [
    "У&nbsp;нас новый завоз царского малосольного тугунка.",
    "Первая икра дикого кижуча сезона 2026",
    "Нежнейшая малосольная черноморская барабуля",
    "Куриные котлетки тоже есть.",
  ]) {
    assert.ok(home.includes(excerpt), `Не сохранена авторская формулировка: ${excerpt}`);
  }
  assert.doesNotMatch(home, /telegram-widget|tgme_widget|Feed not found/i);
});

test("the footer ends both customer journeys with a useful, human invitation", () => {
  for (const page of [home, catalogPage]) {
    assert.match(page, /<footer class="source-footer" aria-labelledby="[^"]+">/);
    assert.match(page, /Лосось на вахте — заходите в лавку/);
    assert.match(page, /<dl class="source-footer__facts">/);
    assert.match(page, /Ежедневно, с&nbsp;11:00 до&nbsp;20:00/);
    assert.match(page, /метро\s+«Вавиловская»/);
    assert.match(page, /href="tel:\+79166751452"/);
    assert.match(page, /class="source-footer__portrait"/);
    assert.match(page, /salmon-cat\.jpg/);
    for (const label of ["Телеграм", "WhatsApp", "YouTube", "SoundCloud"]) {
      assert.ok(page.includes(`<span>${label}</span>`), `В подвале нет подписи ${label}`);
    }
  }

  const catRule =
    styles.match(/\.source-footer__portrait\s+img\s*\{([^}]*)\}/s)?.[1] ?? "";
  assert.match(catRule, /height:\s*auto/);
  assert.doesNotMatch(catRule, /object-fit:\s*cover/);
  assert.doesNotMatch(home + catalogPage + siteScript + styles, /floating-chat|floatingChat/);
});

test("the complete catalog has stable categories and 114 priced items", () => {
  assert.equal(catalog.length, 7);
  assert.equal(
    catalog.reduce((total, category) => total + category.items.length, 0),
    114,
  );
  assert.deepEqual(
    catalog.map((category) => [category.slug, category.items.length]),
    [
      ["caviar", 8],
      ["seafood", 20],
      ["frozen-fish", 35],
      ["fillet", 7],
      ["steaks", 5],
      ["prepared-fish", 12],
      ["other", 27],
    ],
  );

  for (const category of catalog) {
    assert.ok(category.label);
    assert.ok(category.shortLabel);
    for (const product of category.items) {
      assert.ok(product.name);
      assert.match(product.price, /₽/);
    }
  }
});

test("published Russian text uses the shared typographic rules", () => {
  assert.equal(
    typographText("И в лавке от 11:00 до 20:00"),
    "И\u00a0в\u00a0лавке от\u00a011:00 до\u00a020:00",
  );
  assert.equal(
    typographText("Цена 15 000 ₽ за 0,5 кг"),
    "Цена 15\u202f000\u00a0₽ за\u00a00,5\u00a0кг",
  );
  assert.equal(
    typographPrice("15000 ₽/0,125 кг"),
    "15\u202f000\u00a0₽/0,125\u00a0кг",
  );
  assert.equal(typographText("всё „ок“"), "всё «ок»");
  assert.equal(
    typographText("ул. Строителей, д. 7, корп. 1"),
    "ул.\u00a0Строителей, д.\u00a07, корп.\u00a01",
  );
});

test("catalog search and filters expose accessible state", () => {
  assert.match(catalogPage, /aria-live="polite"/);
  assert.match(catalogPage, /data-catalog-search/);
  assert.match(catalogPage, /data-catalog-select/);
  assert.match(catalogScript, /aria-pressed/);
  assert.match(catalogScript, /select\.value = activeCategory/);
  assert.match(catalogScript, /Ничего не найдено/);
  assert.match(catalogScript, /Уточнить наличие/);
});

test("menu, focus and reduced motion remain accessible", () => {
  for (const [page, journalPath] of [
    [home, "#journal"],
    [catalogPage, "../#journal"],
  ]) {
    assert.match(page, /aria-controls="primary-navigation"/);
    assert.match(page, /data-menu-close/);
    assert.match(page, /class="site-menu__close-mark"/);
    assert.match(page, />Закрыть</);
    assert.match(page, /Навигационный мостик/);
    assert.ok(page.includes('<h2 id="menu-title">Куда держим курс?</h2>'));
    assert.match(page, /class="site-menu__layout"/);
    assert.match(page, /class="site-menu__service"/);
    assert.match(page, /class="site-menu__actions"/);
    assert.match(page, /https:\/\/t\.me\/\+79166751452/);
    assert.match(page, /https:\/\/wa\.me\/79166751452/);
    assert.ok(page.includes(`href="${journalPath}"`));
    assert.doesNotMatch(page, />×</);

    const routes = page.match(
      /<section class="site-menu__routes">([\s\S]*?)<\/section>/,
    )?.[1] ?? "";
    assert.equal((routes.match(/<a\s/g) ?? []).length, 6);
  }

  assert.match(siteScript, /event\.key === "Escape"/);
  assert.match(siteScript, /event\.key !== "Tab"/);
  assert.match(siteScript, /menuClose\?\.focus/);
  assert.match(siteScript, /menuPanel\.scrollTop = 0/);
  assert.match(siteScript, /element\.inert = value/);
  assert.match(home, /role="dialog"/);
  assert.match(home, /aria-modal="true"/);
  assert.match(styles, /\.floating-menu\s*\{[\s\S]*?position:\s*fixed;/);
  assert.match(styles, /\.site-menu\s*\{[\s\S]*?inset:\s*0;/);
  assert.match(styles, /\.site-menu__panel\s*\{[\s\S]*?height:\s*100dvh;/);
  assert.match(
    styles,
    /grid-template-columns:\s*minmax\(0, 1\.45fr\) minmax\(22rem, 0\.75fr\)/,
  );
  assert.match(styles, /\.site-menu__service::before[\s\S]*?fish-pattern\.svg/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /prefers-contrast:\s*more/);
  assert.match(styles, /forced-colors:\s*active/);
});

test("theme follows the system and a deliberate choice persists across pages", () => {
  assert.equal(themeStorageKey, "seledkin-theme");
  assert.equal(normalizeTheme("light"), "light");
  assert.equal(normalizeTheme("dark"), "dark");
  assert.equal(normalizeTheme("sepia"), null);
  assert.equal(effectiveTheme(null, false), "light");
  assert.equal(effectiveTheme(null, true), "dark");
  assert.equal(effectiveTheme("light", true), "light");
  assert.equal(effectiveTheme("dark", false), "dark");

  assert.match(siteScript, /import "\.\/theme\.js"/);
  for (const page of [home, catalogPage, notFoundPage]) {
    assert.match(page, /localStorage\.getItem\("seledkin-theme"\)/);
    assert.match(page, /data-theme-toggle/);
    assert.match(page, /Ночная вахта/);
    assert.doesNotMatch(page, /data-theme-toggle[^>]*aria-pressed/);
  }
  assert.match(notFoundPage, /assets\/theme\.js/);
  assert.match(styles, /:root\[data-theme="dark"\]/);
  assert.match(styles, /prefers-color-scheme:\s*dark/);

  for (const [foreground, background, minimum] of [
    ["#f3ede2", "#0e202b", 4.5],
    ["#b8c2c8", "#0e202b", 4.5],
    ["#7dccf2", "#0e202b", 4.5],
    ["#83d8b8", "#0e202b", 4.5],
    ["#d6b46c", "#0e202b", 4.5],
    ["#ffc15c", "#0e202b", 3],
    ["#5d707b", "#0e202b", 3],
  ]) {
    assert.ok(
      contrast(foreground, background) >= minimum,
      `${foreground} on ${background} must reach ${minimum}:1`,
    );
  }
});

test("WCAG 2.2 AA is a mechanical project contract", () => {
  for (const requirement of [
    "WCAG 2.2 AA",
    "4.5:1",
    "3:1",
    "44 × 44",
    "200%",
    "320 CSS-пикселей",
    "forced-colors",
  ]) {
    assert.match(accessibility, new RegExp(requirement.replace(".", "\\.")));
  }

  for (const page of [home, catalogPage, notFoundPage]) {
    assert.match(page, /<html lang="ru">/);
    assert.equal((page.match(/<main\b/g) ?? []).length, 1);
    assert.equal((page.match(/<h1\b/g) ?? []).length, 1);
    for (const image of page.match(/<img\b[^>]*>/gs) ?? []) {
      assert.match(image, /\salt="[^"]*"/);
    }
  }

  assert.match(catalogPage, /role="status"/);
  assert.match(catalogPage, /role="group"/);
  assert.match(styles, /--telegram:\s*#006d9d/);
  assert.match(styles, /--whatsapp:\s*#137a3d/);
  assert.match(styles, /--text-link:\s*#246f55/);
  assert.match(styles, /--focus:\s*#a35d00/);
  assert.match(styles, /--footer:\s*#073d55/);
  assert.match(styles, /--footer-surface:\s*#0b6a84/);
  assert.match(styles, /--footer-text:\s*#fff8ed/);
  assert.match(styles, /--footer-muted:\s*#dce9e8/);
  assert.match(styles, /--footer:\s*#061a26/);
  assert.match(styles, /--footer-surface:\s*#0a4053/);

  for (const [foreground, background, minimum] of [
    ["#006d9d", "#ffffff", 4.5],
    ["#137a3d", "#ffffff", 4.5],
    ["#246f55", "#ffffff", 4.5],
    ["#696969", "#ffffff", 4.5],
    ["#a35d00", "#ffffff", 3],
    ["#ffc15c", "#0e202b", 3],
    ["#8a6b2f", "#ffffff", 3],
    ["#ffffff", "#707070", 4.5],
    ["#fff8ed", "#0b6a84", 4.5],
    ["#dce9e8", "#0b6a84", 4.5],
    ["#f3ede2", "#0a4053", 4.5],
    ["#d3ccc0", "#0a4053", 4.5],
    ["#b8c2c8", "#0a4053", 4.5],
  ]) {
    assert.ok(
      contrast(foreground, background) >= minimum,
      `${foreground} on ${background} must reach ${minimum}:1`,
    );
  }
});

test("the agreed source assets stay unchanged", async () => {
  const files = [
    [
      "../assets/logo-redrawn.svg",
      "49c8d097b56bd670cf46541b19e34f9c89398b7e566110acddd09067c223cc55",
    ],
    [
      "../assets/salmon-cat.jpg",
      "b12d7f749f2bffbfc1ee92dc10d18f050badaaebd8b851708e2b7dd9a625f1bd",
    ],
    [
      "../assets/fish-pattern.svg",
      "31e51adac566e3b0d5cb43858e6e3d4cf1bcd464be08ff629f49fc1ca707625b",
    ],
    [
      "../assets/journal-679.jpg",
      "68d2d55db0dc116bf94c58d99d56b306aec7dae77b9e6b899aa09ff2c0e2f166",
    ],
    [
      "../assets/journal-680.jpg",
      "4c585dfc8d94f59a135ce44bce88e1d461dd6df8b75b1bceb6890e6b6df266e7",
    ],
    [
      "../assets/journal-681.jpg",
      "0e48aaa7c67d2a6687cbe5d4ab6a8f56f2f18536811ddae40d7cd13565fbee2c",
    ],
    [
      "../assets/journal-682.jpg",
      "ce166cf12eb8616f7e0777ef042d71882fe0f56f809b7162aac3c32a32f9a277",
    ],
  ];

  for (const [path, expected] of files) {
    const binary = await readFile(new URL(path, import.meta.url));
    assert.equal(createHash("sha256").update(binary).digest("hex"), expected);
  }
});
