import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { catalogPrice, matchesSearch, orderLinks, positionCount, productKey, legacyProductKey, restoreOrderKeys, productNotes, productSearchText } from "../assets/catalog-model.js";
import { catalog } from "../assets/catalog-data.js";

test("search accepts category terms, reversed words, ё and whitespace", () => {
  assert.ok(matchesSearch("Морепродукты Северная креветка", "креветка северная"));
  assert.ok(matchesSearch("Селёдка слабосолёная", "  СЕЛЕДКА\u00a0слабо  "));
  assert.ok(matchesSearch("Морепродукты Осьминог", "морепродукты"));
  assert.equal(matchesSearch("Икра", "рыба"), false);
  assert.equal(positionCount(114), "114\u00a0позиций");
});

const findProducts = (query) => catalog.flatMap((category) => category.items
  .filter((product) => matchesSearch(
    productSearchText(category, product),
    query,
  )).map((product) => product.name));

test("customers find stocked products using everyday names and inflected words", () => {
  assert.equal(findProducts("креветки").length, 5);
  assert.equal(findProducts("кальмары").length, 3);
  assert.deepEqual(findProducts("селёдка"), ["Сельдь слабосоленая"]);
  assert.deepEqual(findProducts("лосось"), ["Филе лосося", "Стейк лосося", "Лосось слабосоленый"]);
  assert.deepEqual(findProducts("треска"), findProducts("трески"));
  assert.deepEqual(findProducts("СЕВЕРНЫЕ, креветки"), ["Креветка северная в/м"]);
  assert.deepEqual(findProducts("филе лосось"), ["Филе лосося"]);
  assert.equal(findProducts("командорские кальмары").length, 2);
  assert.deepEqual(findProducts("тунец"), ["Филе тунца"]);
  assert.deepEqual(findProducts("щука"), ["Икра щуки"]);
  assert.deepEqual(findProducts("осетр"), findProducts("осетра"));
});

test("preparation terms describe the actual product, not its mixed category", () => {
  assert.deepEqual(findProducts("слабосоленая"), ["Форель слабосоленая", "Лосось слабосоленый", "Сельдь слабосоленая"]);
  assert.deepEqual(findProducts("горячего копчения"), ["Осетр горячего копчения", "Скумбрия горячего копчения"]);
  assert.deepEqual(findProducts("креветка без головы"), ["Креветка тигровая б/г"]);
  assert.deepEqual(findProducts("вареные креветки"), ["Креветка северная в/м"]);
});

test("search keeps partial words and combines terms without mixing different products", () => {
  assert.equal(findProducts("крев").length, 5);
  assert.equal(findProducts("креветки треска").length, 0);
  assert.equal(findProducts("сельдь филе").length, 0);
  assert.equal(findProducts("несуществующая рыба").length, 0);
  assert.equal(findProducts("***").length, 0);
  assert.equal(findProducts("").length, 116);
  assert.equal(matchesSearch("Лосось слабосоленый", "форель"), false);
});

test("both order channels carry the exact product and package, without sending it", () => {
  for (const category of catalog) for (const product of category.items) {
    const links = orderLinks(product);
    const telegram = new URL(links.telegram);
    const whatsapp = new URL(links.whatsapp);
    assert.equal(telegram.pathname, "/+79166751452");
    assert.equal(whatsapp.pathname, "/79166751452");
    assert.equal(telegram.searchParams.get("text"), whatsapp.searchParams.get("text"));
    assert.match(telegram.searchParams.get("text"), /Хочу заказать/);
    assert.match(telegram.searchParams.get("text"), /₽/);
    assert.ok(telegram.searchParams.get("text").includes(catalogPrice(product.price)));
  }
});

test("portion prices use grams without rounding the quantity or changing other units", () => {
  for (const [source, expected] of [
    ["6000 ₽/0,05 кг", "6 000 ₽ за 50 г"],
    ["15 000 ₽/0,125 кг", "15 000 ₽ за 125 г"],
    ["990 ₽/0,5 кг", "990 ₽ за 500 г"],
    ["240 ₽/0,4 кг", "240 ₽ за 400 г"],
    ["190 ₽/0,175 кг", "190 ₽ за 175 г"],
    ["3200 ₽/кг", "3 200 ₽/кг"],
    ["450 ₽/0,9 л", "450 ₽/0,9 л"],
    ["330 ₽/0,450 мл", "330 ₽/0,450 мл"],
  ]) assert.equal(catalogPrice(source), expected);
});

test("abbreviation notes appear only for confirmed preparation terms", () => {
  assert.equal(productNotes({ name: "Креветка северная в/м" }), "В/м — варёно-мороженый продукт");
  assert.equal(productNotes({ name: "Креветка тигровая б/г" }), "Б/г — без головы");
  assert.equal(productNotes({ name: "Скумбрия", description: "ПБГ" }), "ПБГ — потрошёная рыба без головы");
  assert.equal(productNotes({ name: "Филе трески" }), "");
});

test("checked-in HTML catalog is generated from current prices", () => {
  const result = spawnSync(process.execPath, ["scripts/build-catalog.mjs", "--check"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});

test("an order list preserves distinct packages and uses current prices", () => {
  const category = catalog.find(category => category.slug === "caviar");
  const products = category.items.slice(0, 2);
  assert.notEqual(productKey(category, products[0]), productKey(category, products[1]));
  assert.equal(productKey(category, products[0]), productKey(category, { ...products[0], price: "7000 ₽/0,05 кг" }));
  const keys = catalog.flatMap(category => category.items.map(product => productKey(category, product)));
  assert.ok(keys.every(key => /^[a-z0-9-]+$/.test(key)), "every product has an explicit permanent ID");
  assert.equal(new Set(keys).size, keys.length);
  const links = orderLinks(products);
  const draft = new URL(links.telegram).searchParams.get("text");
  assert.equal(draft, new URL(links.whatsapp).searchParams.get("text"));
  for (const product of products) assert.ok(draft.includes(catalogPrice(product.price)));
  assert.equal(draft.match(/Хочу заказать/g).length, 1);
  assert.ok(matchesSearch(productSearchText({ slug: "prepared-fish" }, { name: "Скумбрия", description: "ПБГ" }), "без головы"));
});

test("saved orders migrate to permanent IDs and survive name, description, price and category edits", () => {
  const category = catalog[0], product = category.items[0], second = category.items[1];
  assert.deepEqual(restoreOrderKeys([legacyProductKey(category, product), product.id, second.id, "removed"], catalog), [product.id, second.id]);
  const edited = [{ ...category, slug: "another-category", items: [{ ...product, name: "Новое название", description: "Новое описание", price: "7100 ₽/0,050 кг" }] }];
  assert.deepEqual(restoreOrderKeys([product.id, second.id], edited), [product.id]);
  assert.equal(productKey(edited[0], edited[0].items[0]), product.id);
  assert.deepEqual(restoreOrderKeys(null, catalog), []);
});
