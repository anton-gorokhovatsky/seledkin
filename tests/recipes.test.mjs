import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { catalog } from "../assets/catalog-data.js";
import { matchesSearch, productSearchText, catalogPrice } from "../assets/catalog-model.js";
import { recipes, recipeContent, resolveProduct, productRecipeLinks, productCatalogHref } from "../scripts/recipe-content.mjs";
import { entries, renderRecipesPage } from "../scripts/site-content.mjs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const findProducts = (query, slug) => catalog.filter(category => category.slug === slug)
  .flatMap(category => category.items.filter(product => matchesSearch(productSearchText(category, product), query))
    .map(product => ({ category, product })));
const normalize = value => value.replace(/<br\s*\/?\s*>/g, "\n").replace(/<[^>]*>/g, "")
  .replace(/&nbsp;|&amp;|&quot;|&#39;/g, entity => ({ "&nbsp;": " ", "&amp;": "&", "&quot;": '"', "&#39;": "'" })[entity])
  .replace(/\+7\s*\(?916\)?\s*675[-‑–]14[-‑–]52/g, "+79166751452")
  .replace(/([0-9])\s*°?([CС])/g, "$1C").replace(/([0-9])\s*р\./g, "$1₽")
  .replace(/₽\./g, "₽")
  .replace(/\s|[-—–‑]/g, "");

test("selected archive texts retain every author word, source date and original full frame", () => {
  const sources = JSON.parse(read("tests/fixtures/recipes-channel-2026.json"));
  const media = JSON.parse(read("assets/media-variants.json"));
  for (const source of sources) {
    const entry = entries.find(item => item.id === source.id);
    assert.equal(entry.date, source.date);
    // The user explicitly approved removing the abandoned lone hashtag in 73.
    const sourceText = source.id === 73 ? source.text.replace(/\n\s*#\s*$/, "") : source.text;
    assert.equal(normalize(entry.body), normalize(sourceText), `Author text changed: ${entry.id}`);
    if (source.id === 73) assert.ok(!entry.body.includes('class="journal-tags"'), "An abandoned hashtag must not leave an empty tag row");
    assert.ok(entry.alt);
    assert.ok(media.some(item => item.source === entry.image && item.width > 32));
    assert.ok(read(`journal/${entry.id}/index.html`).includes(source.source));
  }
});

test("recipes point to the right product variant and use live catalog prices", () => {
  const page = renderRecipesPage();
  assert.equal(recipes.filter(recipe => recipe.kind === "recipe").length, 16);
  assert.equal(recipes.filter(recipe => recipe.kind === "advice").length, 4);
  for (const recipe of recipes) {
    assert.ok(entries.some(entry => entry.id === recipe.id));
    assert.ok(page.includes(`href="../journal/${recipe.id}/"`));
    for (const selection of recipe.products) {
      const { category, product } = resolveProduct(selection);
      assert.ok(productRecipeLinks(category, product).includes(recipe));
      const url = new URL(productCatalogHref(selection), "https://ks.fish/");
      const matches = findProducts(url.searchParams.get("q"), selection.category);
      assert.ok(matches.some(result => result.product === product));
      const story = read(`journal/${recipe.id}/index.html`);
      assert.ok(story.includes(catalogPrice(product.price)));
      const context = story.match(/<section class="recipe-current"[\s\S]*?<\/section>/)?.[0];
      assert.ok(context, "A recipe's matching product must have catalog context");
      assert.ok(!context.includes(`href="../../journal/${recipe.id}/"`), "Product context must not loop back to the same recipe");
    }
  }
  const seafood = catalog.find(category => category.slug === "seafood");
  const unpeeled = seafood.items.find(product => product.name === "Креветка патагонская" && !product.description.includes("очищенная"));
  assert.ok(!productRecipeLinks(seafood, unpeeled).some(recipe => recipe.id === 464));
  // The archive's flounder recipe is for another species, not the current fish.
  assert.deepEqual(recipes.find(recipe => recipe.id === 382).products, []);
});

test("dinner collections and the fresh caviar price share catalog facts", () => {
  const page = renderRecipesPage();
  for (const collection of recipeContent.collections) {
    assert.ok(page.includes(`id="${collection.slug}"`));
    for (const selection of collection.products) assert.ok(page.includes(catalogPrice(resolveProduct(selection).product.price)));
  }
  const trout = catalog.find(category => category.slug === "caviar").items.find(product => product.name === "Икра форели");
  assert.equal(trout.price, "4990 ₽/0,250 кг");
  assert.equal(trout.source, "https://t.me/kapitanseledkin/700");
  assert.ok(read("sitemap.xml").includes("https://ks.fish/recipes/"));
  assert.ok(read(".github/workflows/pages.yml").includes("cp recipes/index.html _site/recipes/"));
});
