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
