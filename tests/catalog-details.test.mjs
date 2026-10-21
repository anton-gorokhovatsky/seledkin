import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { catalog, inventory } from "../assets/catalog-data.js";
import { catalogPrice } from "../assets/catalog-model.js";
import { typographText } from "../assets/typography.js";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const details = JSON.parse(read("content/catalog-details.json"));
const html = read("catalog/index.html");
const article = id => html.match(new RegExp(`<article[^>]*id="product-${id}"[\\s\\S]*?</article>`))?.[0];

test("curated details retain source rows and bind existing products without replacing their names or prices", () => {
  const products = catalog.flatMap(category => category.items);
  const ids = new Set(inventory.flatMap(category => category.items.map(product => product.id)));
  assert.equal(new Set(details.products.map(item => item.product)).size, details.products.length);
  for (const item of details.products) {
    assert.ok(ids.has(item.product));
    assert.ok(Number.isInteger(item.source.row) && item.source.row > 0);
    assert.ok(item.source.name && item.source.description);
  }
  assert.equal((html.match(/class="catalog-product"/g) ?? []).length, products.length);
  for (const product of products) {
    assert.ok(article(product.id).includes(`<h4>${typographText(product.name)}</h4>`));
    assert.ok(article(product.id).includes(`<strong>${catalogPrice(product.price)}</strong>`));
  }
});

test("published calories retain an explicit per-100g source value rather than filling gaps by calculation", () => {
  const published = new Set(catalog.flatMap(category => category.items.map(product => product.id)));
  const withCalories = details.products.filter(item => published.has(item.product) && item.kcalPer100g !== undefined);
  assert.equal((html.match(/class="catalog-product-calories"/g) ?? []).length, withCalories.length);
  for (const item of withCalories) {
    assert.match(item.source.description, /на\s*100\s*(?:г|гр|продукт)/iu);
    const energy = item.source.description.match(/калорийность\s*:?\s*(\d+(?:[.,]\d+)?)\s*ккал/iu);
    assert.ok(energy, item.product);
    assert.equal(Number(energy[1].replace(",", ".")), item.kcalPer100g);
    const label = `${new Intl.NumberFormat("ru-RU").format(item.kcalPer100g)}\u00a0ккал на 100 г`;
    assert.ok(article(item.product).includes(typographText(label)), item.product);
  }
  for (const id of ["frozen-fish-008", "frozen-fish-032", "fillet-003", "steaks-005", "seafood-018", "smoked-mackerel", "other-019", "fillet-006"]) {
    if (published.has(id)) assert.doesNotMatch(article(id), /catalog-product-calories/, id);
    else assert.equal(article(id), undefined);
  }
});

test("only selected preparation facts reach the matching product and its search index", () => {
  assert.match(article("fillet-001"), /Без\s+кожи/);
  assert.match(article("fillet-001"), /140–230\s+г/);
  assert.match(article("fillet-003"), /На\s+коже/);
  assert.match(article("seafood-013"), /С\s+головой, в\s+панцире/);
  assert.match(article("seafood-014"), /Без\s+головы, хвоста и\s+кишечной вены/);
  assert.doesNotMatch(article("seafood-014"), /С\s+головой, в\s+панцире|без добавок|E223/);
  for (const id of ["other-025", "seafood-008"]) assert.match(article(id), /Подлежит тепловой обработке/);
  assert.equal(article("other-019"), undefined, "The old 300 g mayonnaise package is retired");
  assert.match(article("other-016"), /Состав: Радужная форель/);
  const roll = article("prepared-fish-012");
  const visibleParagraphs = [...roll.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map(match => match[1]);
  assert.equal(visibleParagraphs.filter(text => /Горячего\s+копчения/.test(text)).length, 1);
  assert.equal(visibleParagraphs.filter(text => /Упаковка\s+250–350\s+г/.test(text)).length, 1);
  assert.doesNotMatch(visibleParagraphs.join(" "), /около\s+300\s+г/);
});
