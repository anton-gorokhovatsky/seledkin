import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { catalog, inventory } from "../assets/catalog-data.js";
import { catalogPrice, orderLinks, restoreOrderKeys } from "../assets/catalog-model.js";
import { recipes, currentSelections, resolveProduct, editorialPath } from "../scripts/recipe-content.mjs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const update = JSON.parse(read("content/prices/oleg-2026-10-21.json"));
const source = read(update.source).split("\n");
const all = new Map(inventory.flatMap(category => category.items.map(product => [product.id, product])));
const listed = new Map(catalog.flatMap(category => category.items.map(product => [product.id, product])));
const rubles = value => Number(value.match(/^\s*([\d\s\u00a0\u202f]+)\s*[₽р]/u)?.[1].replace(/\s/gu, ""));
const portion = value => {
  if (/\/\s*кг$/u.test(value)) return [1, "кг"];
  const part = value.replaceAll(".", ",").match(/\/\s*(\d+(?:,\d+)?)\s*(кг|мл|л|литра?)/u);
  if (!part) return null;
  return [Number(part[1].replace(",", ".")), part[2].startsWith("литр") ? "л" : part[2]];
};

test("every price row in Oleg's supplied list is accounted for once, including explicit blanks and the sprats duplicate", () => {
  const prices = source.flatMap((line, index) =>
    /^\s*(?:\d[\d ]*\s*)?(?:₽|р\/)/u.test(line) && line.trim() !== "590₽/" ? [index + 1] : []);
  assert.equal(prices.length, 143);
  assert.deepEqual(update.rows.map(row => row.priceLine), prices);
  assert.equal(update.rows.filter(row => row.price === null).length, 18);
  for (const row of update.rows) {
    assert.equal(source[row.nameLine - 1], row.name);
    assert.equal(source[row.priceLine - 1].trim(), row.rawPrice);
    const product = all.get(row.product);
    assert.ok(product, `Unaccounted source product: ${row.name}`);
    assert.equal(product.price, row.price, `${row.name}: ${row.rawPrice}`);
    if (row.price === null) {
      assert.equal(product.unlistedReason, "no-price");
      assert.equal(listed.has(product.id), false);
    } else {
      assert.equal(rubles(product.price), rubles(row.rawPrice), row.name);
      const sourcePortion = portion(row.rawPrice);
      if (sourcePortion) assert.deepEqual(portion(product.price), sourcePortion, row.name);
      for (const link of Object.values(orderLinks(product))) {
        assert.ok(new URL(link).searchParams.get("text").includes(catalogPrice(product.price)));
      }
    }
  }
  const sprats = update.rows.filter(row => /Шпроты/u.test(row.name));
  assert.equal(sprats.length, 2);
  assert.equal(sprats[0].product, sprats[1].product);
  for (const row of update.pending) {
    assert.equal(source[row.line - 1], row.raw);
    assert.equal(all.get(row.product).price, null, "A malformed price must not become an invented selling price");
  }
  for (const row of update.clarifications) {
    assert.equal(source[row.line - 1], row.raw);
    assert.equal(row.confirmedBy, "user");
    assert.equal(listed.get(row.product).price, row.price);
    for (const link of Object.values(orderLinks(listed.get(row.product)))) {
      assert.ok(new URL(link).searchParams.get("text").includes(catalogPrice(row.price)));
    }
  }
});

test("different packages keep different IDs and cannot replace a saved order by name", () => {
  for (const { product: old, replacement } of update.retiredPackages) {
    assert.ok(all.has(old) && listed.has(replacement));
    assert.equal(all.get(old).price, null);
    assert.notEqual(old, replacement);
    assert.deepEqual(restoreOrderKeys([old], catalog), []);
    assert.deepEqual(restoreOrderKeys([old, replacement], catalog), [replacement]);
  }
  for (const [id, price, unit] of [
    ["pink-salmon-roe-125", "2500 ₽/0,125 кг", "pack"],
    ["pike-roe-112", "1800 ₽/0,112 кг", "pack"],
    ["masago-roe-500", "999 ₽/0,5 кг", "pack"],
    ["anchovy-fillet-in-oil", "1500 ₽/0,1 кг", "kg"],
    ["soy-sauce-500", "440 ₽/0,5 л", "pack"],
    ["other-015", "440 ₽/0,9 л", "pack"],
    ["other-024", "250 ₽/0,250 кг", "pack"],
  ]) {
    assert.equal(listed.get(id).price, price);
    assert.equal(listed.get(id).quantityUnit, unit);
  }
});

test("unpriced products retain the dated editorial reference but have no current-price card or catalog link", () => {
  const catalogPage = read("catalog/index.html");
  const contextPages = [read("index.html"), read("recipes/index.html"), ...JSON.parse(read("content/journal.json")).map(entry => read(`${editorialPath(entry.id)}index.html`))];
  for (const product of all.values()) {
    if (product.price !== null) {
      assert.ok(rubles(product.price) > 0, product.id);
      assert.ok(listed.has(product.id));
      continue;
    }
    assert.ok(product.unlistedReason, `An unexplained missing price: ${product.id}`);
    assert.ok(!catalogPage.includes(`id="product-${product.id}"`));
    for (const html of contextPages) assert.ok(!html.includes(`?product=${product.id}#`), `Unlisted selling link: ${product.id}`);
  }
  const gorbusha = recipes.find(recipe => recipe.id === 150);
  assert.equal(resolveProduct(gorbusha.products[0]).product.id, "frozen-fish-008");
  assert.deepEqual(currentSelections(gorbusha.products), []);
  assert.ok(read("recipes/150/index.html").includes('class="ship-log-entry__body"'));
});
