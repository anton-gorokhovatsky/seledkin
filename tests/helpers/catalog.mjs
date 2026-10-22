import { catalog } from "../../assets/catalog-data.js";
import { positionCount, catalogPositionCount, groupCatalogProducts } from "../../assets/catalog-model.js";

// Data completeness and exact source prices have their own price-list contract.
// Journey tests compare the rendered count with the current published inventory.
export const catalogSize = catalog.reduce((total, category) => total + category.items.length, 0);
export const catalogVisibleSize = catalogPositionCount(catalog);
export const catalogCount = positionCount(catalogVisibleSize);
export const categorySize = slug => groupCatalogProducts(catalog.find(category => category.slug === slug).items).length;
export const legacyCatalogSize = catalog.flatMap(category => category.items)
  .filter(product => product.previousCategory === "other").length;
