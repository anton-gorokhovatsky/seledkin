import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { catalog, inventory } from "../assets/catalog-data.js";
import { catalogPrice, productHref } from "../assets/catalog-model.js";
import { recipeForEntry, resolveProduct, editorialPath } from "./recipe-content.mjs";
import { readReleaseChanges } from "./release-scope.mjs";
import { catalogDataChanges, editorialReleaseIds } from "./editorial-release.mjs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
export const editorialText = text => text.replace(/<[^>]*>/g, "")
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
  .replace(/&shy;|\u00ad/g, "").replace(/(\d)[ \u00a0\u202f](?=\d{3}(?:\D|$))/g, "$1")
  .replace(/(?<=\d)–(?=\d)/g, "-").replace(/(\d)[ \u00a0\u202f]+%/g, "$1%")
  .replace(/[\s\u00a0\u202f]+/gu, " ").trim();

export function checkEditorialRelease(ids, changes = []) {
  assert.ok(ids.length, "No publication IDs selected");
  const entries = JSON.parse(read("content/journal.json"));
  const fixtures = readdirSync(new URL("../tests/fixtures/", import.meta.url))
    .filter(name => /^journal-.*-\d{4}\.json$/.test(name))
    .flatMap(name => JSON.parse(read(`tests/fixtures/${name}`)));
  const products = catalog.flatMap(category => category.items);
  const selectedProducts = new Set(), sources = new Set();
  for (const id of ids.map(String)) {
    const entry = entries.find(entry => String(entry.id) === id);
    assert.ok(entry, `Unknown publication: ${id}`);
    assert.equal(entries.filter(entry => String(entry.id) === id).length, 1, `Duplicate publication ID: ${id}`);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(entry.date), `Missing publication date: ${id}`);
    assert.equal(new Date(`${entry.date}T12:00:00Z`).toISOString().slice(0, 10), entry.date, `Invalid source date: ${id}`);
    assert.ok(entry.title?.trim() && !entry.title.endsWith("."), `Invalid title: ${id}`);
    assert.ok(entry.alt?.trim(), `Missing photo description: ${id}`);
    assert.match(entry.image, new RegExp(`^journal-${id}(?:-\\d+)?\\.(?:jpg|jpeg|png|webp)$`));
    assert.ok(readFileSync(new URL(`../assets/${entry.image}`, import.meta.url)).length, `Missing original photo: ${id}`);
    const fixture = fixtures.find(post => String(post.id) === id);
    assert.ok(fixture, `Add the verified author text to tests/fixtures/journal-<month>-<year>.json: ${id}`);
    const source = entry.source?.url ?? `https://t.me/kapitanseledkin/${id}`;
    const sourceUrl = new URL(source);
    assert.equal(sourceUrl.protocol, "https:", `Unsafe source URL: ${id}`);
    assert.ok(["t.me", "www.facebook.com", "facebook.com"].includes(sourceUrl.hostname), `Unknown author source: ${id}`);
    assert.equal(fixture.source, source, `Changed original source: ${id}`);
    assert.equal(fixture.date, entry.date, `Changed source date: ${id}`);
    sources.add(source);
    const original = editorialText(read(`content/journal/${id}.html`));
    const page = read(`${editorialPath(entry.id)}index.html`);
    const article = page.match(/<article\b[^>]*id="journal-entry-[^"]+"[\s\S]*?<\/article>/)?.[0];
    assert.ok(article, `Missing published article: ${id}`);
    for (const paragraph of fixture.paragraphs) {
      assert.ok(original.includes(editorialText(paragraph)), `Lost archived source ${id}: ${paragraph}`);
      const tags = /^(?:#[\p{L}\p{N}_]+\s*)+$/u.test(paragraph.trim());
      if (!tags && !fixture.omittedContactParagraphs?.includes(paragraph)) {
        assert.ok(editorialText(article).includes(editorialText(paragraph)), `Changed author paragraph ${id}: ${paragraph}`);
      }
    }
    for (const paragraph of fixture.omittedContactParagraphs ?? []) {
      assert.ok(!editorialText(article).includes(editorialText(paragraph)), `Contact signature leaked into publication ${id}: ${paragraph}`);
    }
    const recipe = recipeForEntry(entry.id);
    if (!recipe) {
      const journal = entries.filter(item => !recipeForEntry(item.id));
      const index = journal.findIndex(item => String(item.id) === id);
      assert.ok(!journal[index - 1] || journal[index - 1].date >= entry.date, `Journal dates are out of order before ${id}`);
      assert.ok(!journal[index + 1] || entry.date >= journal[index + 1].date, `Journal dates are out of order after ${id}`);
    }
    const selected = recipe ? recipe.products.map(selection => resolveProduct(selection).product.id) : entry.catalogProductIds;
    assert.ok(selected?.length, `Link the publication to its exact catalog product: ${id}`);
    const inHero = entries.filter(item => !recipeForEntry(item.id)).slice(0, 5).some(item => String(item.id) === id);
    if (!recipe && inHero) assert.ok(entry.heroOrderName?.trim(), `Add the order caption to publication data: ${id}`);
    for (const productId of selected) {
      const product = products.find(product => product.id === productId);
      assert.ok(product?.price && product.quantityUnit, `Missing current price or exact product ${id}: ${productId}`);
      assert.ok(page.includes(productHref(product, "../../").replaceAll("&", "&amp;")), `Missing catalog route ${id}: ${productId}`);
      assert.ok(editorialText(page).includes(editorialText(catalogPrice(product.price))), `Missing current price ${id}: ${productId}`);
      selectedProducts.add(productId);
    }
  }
  const data = changes.find(change => change.path === "assets/catalog-data.js");
  if (data) {
    const changed = catalogDataChanges(data.before, data.after);
    assert.ok(changed, "Catalog module changes exceed literal product data");
    for (const id of changed) {
      assert.ok(selectedProducts.has(id), `Unrelated catalog change: ${id}`);
      assert.ok(sources.has(inventory.flatMap(category => category.items).find(product => product.id === id)?.source), `Set the new product/price source: ${id}`);
    }
  }
  return { ids: ids.map(String), products: [...selectedProducts] };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const base = process.argv[2]?.startsWith("--") ? null : process.argv[2];
  const changes = base ? readReleaseChanges(base) : [];
  const explicit = process.argv.find(value => value.startsWith("--ids="))?.slice(6);
  const ids = explicit ? explicit.split(",") : process.env.EDITORIAL_IDS ? JSON.parse(process.env.EDITORIAL_IDS) : editorialReleaseIds(changes);
  console.log(JSON.stringify(checkEditorialRelease(ids, changes ?? [])));
}
