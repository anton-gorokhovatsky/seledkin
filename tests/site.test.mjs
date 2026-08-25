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

  assert.match(home, /Смотреть каталог и цены/);
  assert.match(home, /Заказать в Телеграме/);
  assert.match(home, /метро «Вавиловская»/);
  assert.doesNotMatch(home, /метро «Университет»/);
  assert.match(home, /Ежедневно, 11:00—20:00/);
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
  assert.match(catalogScript, /aria-pressed/);
  assert.match(catalogScript, /Ничего не найдено/);
  assert.match(catalogScript, /Уточнить наличие/);
});

test("theme follows the system and persists the explicit choice", () => {
  assert.match(styles, /prefers-color-scheme:\s*dark/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(siteScript, /seledkin-theme/);
  assert.match(siteScript, /matchMedia\("\(prefers-color-scheme: dark\)"\)/);
  assert.match(siteScript, /Дневная смена — включить светлую тему/);
  assert.match(siteScript, /Ночная смена — включить тёмную тему/);
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
