import test from "node:test";
import assert from "node:assert/strict";
import { catalog } from "../assets/catalog-data.js";
import { productKey } from "../assets/catalog-model.js";
import { createOrderStore, orderStoragePrefix } from "../assets/order-store.js";

const products = new Map(catalog.flatMap(category => category.items.map(product => [productKey(category, product), product])));
function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}

test("stale tabs preserve different products, quantities and removals", () => {
  const saved = storage();
  const first = createOrderStore(products, catalog, () => saved);
  const second = createOrderStore(products, catalog, () => saved);
  first.read(); second.read();
  first.set("caviar-001", "2");
  second.set("seafood-009", "0,5");
  assert.deepEqual([...first.read().selected], ["caviar-001", "seafood-009"]);
  first.set("caviar-001", "3");
  assert.deepEqual(Object.fromEntries(second.read().amounts), {"caviar-001":"3", "seafood-009":"0,5"});
  second.remove("caviar-001");
  first.set("seafood-009", "1");
  assert.deepEqual([...second.read().selected], ["seafood-009"]);
  assert.equal(second.read().amounts.get("seafood-009"), "1");
});

test("migration retains the old list and rejects only a damaged product entry", () => {
  const saved = storage();
  saved.setItem("seledkin-order-list", JSON.stringify(["caviar-001", "seafood-009"]));
  saved.setItem("seledkin-order-amounts", JSON.stringify({"caviar-001":"2"}));
  const store = createOrderStore(products, catalog, () => saved);
  assert.equal(store.read().amounts.get("caviar-001"), "2");
  saved.setItem(orderStoragePrefix + "seafood-009", "damaged");
  assert.deepEqual([...store.read().selected], ["caviar-001"]);
  assert.equal(store.available, true);
});

test("unavailable storage retains the list for the current visit", () => {
  const store = createOrderStore(products, catalog, () => { throw new Error("blocked"); });
  store.set("caviar-001", "2");
  assert.equal(store.read().amounts.get("caviar-001"), "2");
  assert.equal(store.available, false);
  store.remove("caviar-001");
  assert.equal(store.read().selected.size, 0);
});

test("readable storage with blocked writes does not erase the in-memory list", () => {
  const store = createOrderStore(products, catalog, () => ({
    getItem: () => null,
    setItem() { throw new Error("quota"); },
    removeItem() { throw new Error("quota"); },
  }));
  store.set("caviar-001", "2");
  store.set("seafood-009", "0,5");
  assert.deepEqual([...store.read().selected], ["caviar-001", "seafood-009"]);
  assert.equal(store.read().amounts.get("caviar-001"), "2");
  assert.equal(store.available, false);
});

test("a changed sale unit preserves the item without interpreting old pieces as kilograms", () => {
  for (const atomic of [false, true]) {
    const saved = storage();
    if (atomic) {
      saved.setItem("seledkin-order-format", "2");
      saved.setItem(orderStoragePrefix + "other-017", JSON.stringify({ amount: "2", addedAt: 1 }));
    } else {
      saved.setItem("seledkin-order-list", JSON.stringify(["other-017"]));
      saved.setItem("seledkin-order-amounts", JSON.stringify({ "other-017": "2" }));
    }
    const store = createOrderStore(products, catalog, () => saved);
    assert.deepEqual([...store.read().selected], ["other-017"]);
    assert.equal(store.read().amounts.has("other-017"), false);
    store.set("other-017", "0,25");
    assert.equal(createOrderStore(products, catalog, () => saved).read().amounts.get("other-017"), "0,25");
  }
});
