import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { catalog } from "../assets/catalog-data.js";

const home = await readFile(new URL("../index.html", import.meta.url), "utf8");
const catalogPage = await readFile(
  new URL("../catalog/index.html", import.meta.url),
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
    "fish-divider.png",
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
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(siteScript + home + catalogPage, /seledkin-theme|data-theme-toggle/);
});

test("the agreed logo and Salmon portrait are byte-identical", async () => {
  const files = [
    [
      "../assets/logo-redrawn.svg",
      "49c8d097b56bd670cf46541b19e34f9c89398b7e566110acddd09067c223cc55",
    ],
    [
      "../assets/salmon-cat.jpg",
      "b12d7f749f2bffbfc1ee92dc10d18f050badaaebd8b851708e2b7dd9a625f1bd",
    ],
  ];

  for (const [path, expected] of files) {
    const binary = await readFile(new URL(path, import.meta.url));
    assert.equal(createHash("sha256").update(binary).digest("hex"), expected);
  }
});
