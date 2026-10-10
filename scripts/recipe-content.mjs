import { readFileSync } from "node:fs";
import { catalog } from "../assets/catalog-data.js";
import { productHref } from "../assets/catalog-model.js";

export const recipeContent = JSON.parse(readFileSync(new URL("../content/recipes.json", import.meta.url), "utf8"));
export const recipes = recipeContent.recipes;
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
