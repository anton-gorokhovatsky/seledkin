import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { matchesSearch, orderLinks, positionCount } from "../assets/catalog-model.js";
import { catalog } from "../assets/catalog-data.js";

test("search accepts category terms, reversed words, ё and whitespace", () => {
  assert.ok(matchesSearch("Морепродукты Северная креветка", "креветка северная"));
  assert.ok(matchesSearch("Селёдка слабосолёная", "  СЕЛЕДКА\u00a0слабо  "));
  assert.ok(matchesSearch("Морепродукты Осьминог", "морепродукты"));
  assert.equal(matchesSearch("Икра", "рыба"), false);
  assert.equal(positionCount(114), "114 позиций");
});

const findProducts = (query) => catalog.flatMap((category) => category.items
  .filter((product) => matchesSearch(
    [category.label, category.shortLabel, product.name, product.description].filter(Boolean).join(" "),
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
});

test("search keeps partial words and combines terms without mixing different products", () => {
  assert.equal(findProducts("крев").length, 5);
  assert.equal(findProducts("креветки треска").length, 0);
  assert.equal(findProducts("сельдь филе").length, 0);
  assert.equal(findProducts("несуществующая рыба").length, 0);
  assert.equal(findProducts("***").length, 0);
  assert.equal(findProducts("").length, 114);
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
  }
});

test("checked-in HTML catalog is generated from current prices", () => {
  const result = spawnSync(process.execPath, ["scripts/build-catalog.mjs", "--check"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});
