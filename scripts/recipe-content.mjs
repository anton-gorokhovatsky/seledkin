import { readFileSync } from "node:fs";
import { catalog } from "../assets/catalog-data.js";
import { productHref } from "../assets/catalog-model.js";

export const recipeContent = JSON.parse(readFileSync(new URL("../content/recipes.json", import.meta.url), "utf8"));
const publications = JSON.parse(readFileSync(new URL("../content/journal.json", import.meta.url), "utf8"));
const publicationDate = recipe => {
  const date = publications.find(entry => entry.id === recipe.id)?.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) throw new Error(`Missing recipe publication date: ${recipe.id}`);
  return date;
};
// Original dates determine the reading order, including imported archive posts.
// Editorial typography never pins a story above newer ones.
export const recipes = [...recipeContent.recipes].sort((a, b) =>
  publicationDate(b).localeCompare(publicationDate(a)) || String(a.id).localeCompare(String(b.id)));
export const recipeOpening = recipes.slice(0, 3);
export const recipeForEntry = id => recipes.find(recipe => recipe.id === id);
// A publication has one home on the site, regardless of its social source.
export const editorialPath = id => `${recipeForEntry(id) ? "recipes" : "journal"}/${id}/`;
export const recipeIngredients = [
  ["all", "Все материалы"], ["fish", "Рыба"], ["mussels", "Мидии"],
  ["shrimp", "Креветки"], ["octopus", "Осьминог"], ["roe", "Икра"], ["pasta", "Паста"],
];
for (const recipe of recipes) {
  if (!recipeIngredients.some(([slug]) => slug !== "all" && slug === recipe.ingredient)) {
    throw new Error(`Missing recipe ingredient: ${recipe.id}`);
  }
}

export function resolveProduct(selection) {
  const category = catalog.find(item => item.slug === selection.category);
  const matches = category?.items.filter(item => item.name === selection.name
    && (!selection.description || item.description === selection.description)) ?? [];
  // A recipe for the peeled shrimp must not silently pick the unpeeled variant.
  if (matches.length !== 1) throw new Error(`Ambiguous or missing recipe product: ${JSON.stringify(selection)}`);
  return { category, product: matches[0] };
}

export function matchesProduct(selection, category, product) {
  return selection.category === category.slug && selection.name === product.name
    && (!selection.description || selection.description === product.description);
}

export function productRecipeLinks(category, product) {
  return recipes.filter(recipe => recipe.products.some(selection => matchesProduct(selection, category, product)));
}

export function productCatalogHref(selection, root = "", source = "") {
  return productHref(resolveProduct(selection).product, root, source);
}

for (const selection of [...recipes.flatMap(recipe => recipe.products),
  ...recipeContent.collections.flatMap(collection => collection.products),
  ...recipeContent.productStories.flatMap(story => story.products)]) resolveProduct(selection);
if (new Set(recipes.map(recipe => recipe.id)).size !== recipes.length) throw new Error("Duplicate recipe selection");
