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
  assert.match(home, /aria-controls="primary-navigation"/);
  assert.match(home, /data-menu-close/);
  assert.match(siteScript, /event\.key === "Escape"/);
  assert.match(siteScript, /event\.key !== "Tab"/);
  assert.match(siteScript, /menuClose\?\.focus/);
  assert.match(siteScript, /element\.inert = value/);
  assert.match(home, /role="dialog"/);
  assert.match(home, /aria-modal="true"/);
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

  for (const [foreground, background, minimum] of [
    ["#006d9d", "#ffffff", 4.5],
    ["#137a3d", "#ffffff", 4.5],
    ["#246f55", "#ffffff", 4.5],
    ["#696969", "#ffffff", 4.5],
    ["#a8a8a8", "#171717", 4.5],
    ["#a35d00", "#ffffff", 3],
    ["#a35d00", "#171717", 3],
    ["#8a6b2f", "#ffffff", 3],
    ["#ffffff", "#707070", 4.5],
  ]) {
    assert.ok(
      contrast(foreground, background) >= minimum,
      `${foreground} on ${background} must reach ${minimum}:1`,
    );
  }
});

test("the agreed logo, fish pattern and Salmon portrait stay unchanged", async () => {
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
  ];

  for (const [path, expected] of files) {
    const binary = await readFile(new URL(path, import.meta.url));
    assert.equal(createHash("sha256").update(binary).digest("hex"), expected);
  }
});
