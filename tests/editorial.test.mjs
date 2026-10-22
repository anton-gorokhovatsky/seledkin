import { editorialPath, recipeForEntry, recipes, resolveProduct } from "../scripts/recipe-content.mjs";
import { renderHeroJournalProducts } from "../scripts/site-content.mjs";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { catalog } from "../assets/catalog-data.js";
import { catalogPrice, matchesSearch, productHref, productSearchText } from "../assets/catalog-model.js";
import { isSocialTagRow } from "./helpers/editorial-prose.mjs";
const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [home, about, archive, originals] = await Promise.all([
  read("index.html"), read("about/index.html"), read("journal/index.html"),
  read("tests/fixtures/editorial-paragraphs.json").then(JSON.parse),
]);
const ids = JSON.parse(await read("content/journal.json"));
const journalPages = await Promise.all(ids.map(entry => read(`${editorialPath(entry.id)}index.html`)));
const journal = journalPages.join("\n");
const plain = text => text.replace(/<[^>]*>/g, "")
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '\"')
  .replace(/&shy;|\u00ad/g, "")
  // Typography may change number grouping, range dashes and the percent space;
  // every word, digit and the rest of Oleg's punctuation must still match.
  .replace(/(\d)[ \u00a0\u202f](?=\d{3}(?:\D|$))/g, "$1")
  .replace(/(?<=\d)–(?=\d)/g, "-")
  .replace(/(\d)[ \u00a0\u202f]+%/g, "$1%")
  .replace(/[\s\u00a0\u202f]+/gu, " ").trim();

test("every original editorial paragraph survives on its published page", () => {
  const paragraphs = [...(home + about + archive + journal).matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map(match => plain(match[1]));
  // The archive introduction and generated dates/platforms/record IDs are UI
  // metadata, not Oleg's paragraphs. Current prices are checked below.
  assert.equal(originals.length, 32);
  for (const paragraph of originals) assert.ok(paragraphs.includes(plain(paragraph)), `Lost author paragraph: ${paragraph.slice(0, 80)}`);
  assert.match(home, /href="about\/"/);
  assert.match(home, /href="journal\/"/);
  assert.doesNotMatch(home, /<article\s+class="ship-log-entry/);
});

test("all homepage price examples agree with the current catalog", () => {
  const preview = home.match(/<section class="price-preview"[\s\S]*?<\/section>/)?.[0] ?? '';
  const products = [...preview.matchAll(/<h4><a href="([^"]+)"><span class="catalog-product-name">([^<]+)<\/span><\/a><\/h4><strong>([^<]+)<\/strong>/g)];
  assert.equal(products.length, 6);
  const comparable = value => plain(value).replaceAll('ё', 'е');
  for (const [, href, name, price] of products) {
    const url = new URL(href.replaceAll("&amp;", "&"), "https://ks.fish/");
    assert.equal(url.pathname, "/catalog/");
    const product = catalog.flatMap(category => category.items).find(item => item.id === url.searchParams.get("product"));
    assert.ok(product && comparable(product.name) === comparable(name)
      && comparable(catalogPrice(product.price)) === comparable(price), `Homepage disagrees with catalog: ${plain(name)} ${plain(price)}`);
    assert.equal(url.hash, `#product-${product.id}`);
  }
});

test("all journal entries retain their source and a draft about that exact product", () => {
  assert.doesNotMatch(archive, /atlas-record__number/);
  assert.doesNotMatch(journal, /Запись №/);
  assert.equal([...journal.matchAll(/<article\s+class="ship-log-entry\b/g)].length, ids.length);
  // A current-product article now belongs inside the story. Matching the
  // first closing article tag would cut off the story's inquiry link.
  journalPages.forEach((entry, index) => {
    const { id, product, source } = ids[index];
    const original = source?.url ?? `https://t.me/kapitanseledkin/${id}`;
    assert.ok(entry.includes(`id="journal-entry-${id}"`));
    const inquiries = [...entry.matchAll(/href="(https:\/\/t\.me\/\+79166751452\?text=[^"]+)"/g)];
    assert.equal(inquiries.length, 1, `One product inquiry on publication ${id}`);
    const inquiry = inquiries[0][1];
    const draft = new URL(inquiry).searchParams.get("text");
    assert.ok(draft.includes(product));
    assert.ok(draft.includes(original));
    assert.match(draft, /есть ли в наличии/);
    assert.doesNotMatch(draft, /[₽]|руб/);
    assert.ok(entry.includes(`href="${original.replaceAll("&", "&amp;")}"`));
  });
});


test("journal updates preserve each dated author paragraph and source outside approved social tag rows", async () => {
  const fixtures = (await readdir(new URL("fixtures/", import.meta.url))).filter(name => /^journal-.*-\d{4}\.json$/.test(name));
  const posts = (await Promise.all(fixtures.map(name => read(`tests/fixtures/${name}`).then(JSON.parse)))).flat();
  for (const post of posts) {
    const entry = journal.match(new RegExp(`<article[^>]+id="journal-entry-${post.id}"[\\s\\S]*?</article>`))?.[0];
    assert.ok(entry, `Missing post ${post.id}`);
    assert.ok(entry.includes(`datetime="${post.date}"`));
    assert.ok(entry.includes(`href="${post.source}"`));
    assert.ok(plain(entry).includes(plain(post.title).replace(/\.$/u, "")));
    const sourceBody = await read(`content/journal/${post.id}.html`);
    for (const paragraph of post.paragraphs) assert.ok(plain(sourceBody).includes(plain(paragraph)), `Lost archived source in ${post.id}`);
    for (const paragraph of post.omittedContactParagraphs ?? []) assert.ok(!plain(entry).includes(plain(paragraph)), `Contact signature in ${post.id}`);
    for (const paragraph of post.paragraphs.filter(paragraph => !isSocialTagRow(paragraph) && !post.omittedContactParagraphs?.includes(paragraph))) assert.ok(plain(entry).includes(plain(paragraph)), `Changed author text in ${post.id}: ${paragraph}`);
  }
});

test("the latest owner price list supersedes dated September prices without changing the author text", () => {
  const products = catalog.flatMap(category => category.items);
  for (const [name, price] of [
    ["Чир", "2200 ₽/кг"],
    ["Филе трески", "2490 ₽/кг"],
    ["Стейк лосося", "2990 ₽/кг"],
    ["Скумбрия горячего копчения", "1650 ₽/кг"],
    ["Скумбрия холодного копчения", "1800 ₽/кг"],
  ]) {
    assert.equal(products.find(product => product.name === name)?.price, price, name);
  }
});

test("selling publications expose their sourced catalog position and current price on the published page", async () => {
  const products = catalog.flatMap(category => category.items);
  for (const entry of ids.filter(entry => !recipeForEntry(entry.id))) {
    const source = entry.source?.url ?? `https://t.me/kapitanseledkin/${entry.id}`;
    const sourced = products.filter(product => product.source === source);
    // Repeat deliveries may use the existing exact product selected by the hero.
    const selected = renderHeroJournalProducts([entry]).includes(`data-journal-id="${entry.id}"`);
    assert.ok(sourced.length || selected, `Add the missing product to the catalog before publishing ${entry.id}: ${entry.title}`);
    const page = await read(`${editorialPath(entry.id)}index.html`);
    const context = page.match(/<section class="recipe-current"[\s\S]*?<\/section>/)?.[0];
    assert.ok(context, `No route from publication ${entry.id} to its current catalog product`);
    for (const product of sourced) {
      assert.ok(product.quantityUnit, `Missing selling unit: ${product.id}`);
      assert.match(catalogPrice(product.price), /\d.*₽/, `Missing confirmed price: ${product.id}`);
      assert.ok(context.includes(`href="${productHref(product, "../../")}"`), `Missing exact catalog link in ${entry.id}: ${product.id}`);
      assert.ok(plain(context).includes(plain(catalogPrice(product.price))), `Missing current price in ${entry.id}: ${product.id}`);
    }
  }
  const repeat = await read("journal/698/index.html");
  assert.ok(repeat.includes('href="../../catalog/?product=caspian-herring#product-caspian-herring"'));
});

test("recipes never silently omit their product", () => {
  for (const recipe of recipes) {
    if (recipe.products.length) {
      for (const selection of recipe.products) {
        const { product } = resolveProduct(selection);
        assert.ok(product.price || product.unlistedReason === "no-price", `Unknown product or unexplained omission: ${recipe.id}`);
      }
    } else {
      const entry = ids.find(entry => entry.id === recipe.id);
      assert.ok(entry.date < "2026-01-01" && recipe.catalogGap?.trim(), `Add the recipe's missing catalog product: ${recipe.id}`);
    }
  }
});
