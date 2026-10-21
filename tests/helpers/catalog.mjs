import { catalog } from "../../assets/catalog-data.js";
import { positionCount } from "../../assets/catalog-model.js";

// Data completeness and exact source prices have their own price-list contract.
// Journey tests compare the rendered count with the current published inventory.
export const catalogSize = catalog.reduce((total, category) => total + category.items.length, 0);
export const catalogCount = positionCount(catalogSize);
export const categorySize = slug => catalog.find(category => category.slug === slug).items.length;
export const legacyCatalogSize = catalog.flatMap(category => category.items)
  .filter(product => product.previousCategory === "other").length;
