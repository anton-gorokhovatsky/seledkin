import assert from "node:assert/strict";
import test from "node:test";
import { analyticsAllowed, exclusionKey } from "../assets/analytics-policy.js";
import { createSearchTracker } from "../assets/catalog-analytics.js";

const memoryStore = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};

test("service visits stay excluded when following clean links, until explicitly resumed", () => {
  for (const marker of ["audit=release-check", "release=commit", "qa=1", "analytics=off"]) {
    const store = memoryStore();
    assert.equal(analyticsAllowed(new URL(`https://ks.fish/?${marker}`), store), false);
    assert.equal(store.getItem(exclusionKey), "1");
    assert.equal(analyticsAllowed(new URL("https://ks.fish/catalog/"), store), false);
    assert.equal(analyticsAllowed(new URL("https://ks.fish/?analytics=on"), store), true);
  }
  assert.equal(analyticsAllowed(new URL("https://ks.fish/?analytics=on&audit=1"), memoryStore()), false);
  assert.equal(analyticsAllowed(new URL("https://ks.fish/?analytics=on"), memoryStore(), true), false);
});

test("only ordinary public visits load analytics, including when storage is unavailable", () => {
  for (const host of ["ks.fish", "www.ks.fish"]) assert.equal(analyticsAllowed(new URL(`https://${host}/catalog/`), memoryStore()), true);
  for (const url of ["http://127.0.0.1:4173/", "https://anton-gorokhovatsky.github.io/seledkin/"]) assert.equal(analyticsAllowed(new URL(url), memoryStore()), false);
  const blocked = { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); } };
  assert.equal(analyticsAllowed(new URL("https://ks.fish/?audit=1"), blocked), false);
  assert.equal(analyticsAllowed(new URL("https://ks.fish/"), blocked), true);
});

test("category mismatch and recovery are distinguished without transmitting a search phrase", () => {
  const events = [];
  const tracker = createSearchTracker((...args) => events.push(args));
  tracker.track({ query: "креветки", category: "caviar", products: 0, journal: 1, totalProducts: 5 }, "category");
  assert.equal(events[1][0], "catalog_search_empty");
  assert.equal(events[1][1].result, "other_category");
  tracker.track({ query: "Креветки", category: "all", products: 5, journal: 1, totalProducts: 5 }, "broaden");
  assert.equal(events[3][0], "catalog_search_recovered");
  assert.equal(events[3][1].method, "category");
  assert.equal(events[3][1].previous_result, "other_category");
  tracker.track({ query: "креветки", category: "all", products: 5, journal: 1, totalProducts: 5 }, "blur");
  assert.equal(events.length, 4);
  assert.ok(!JSON.stringify(events).includes("креветки"));
});

test("absent products, journal-only results, and a changed successful query remain separate", () => {
  const events = [];
  const tracker = createSearchTracker((...args) => events.push(args));
  const search = (query, products, journal) => tracker.track({ query, category: "all", products, journal, totalProducts: products }, "enter");
  search("такойрыбынет", 0, 0);
  search("риет", 0, 1);
  assert.deepEqual(events.filter(([name]) => name === "catalog_search_empty").map(([,params]) => params.result), ["none", "journal_only"]);
  search("тунец", 1, 0);
  assert.equal(events.at(-1)[0], "catalog_search_recovered");
  assert.equal(events.at(-1)[1].method, "query");
  tracker.reset();
  search("тунец", 1, 0);
  assert.equal(events.filter(([name]) => name === "catalog_search_recovered").length, 1);
  search("", 114, 0);
  assert.equal(events.at(-1)[0], "catalog_search");
});
