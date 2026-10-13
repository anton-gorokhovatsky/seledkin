import { recipeRoutes } from "./recipe-routes.js";

// Old public fragments keep working after recipes move to their own section.
function openLegacyEntry() {
  const id = location.hash.match(/^#journal-entry-(\d+)$/)?.[1];
  if (!id) return;
  const link = document.querySelector(`#journal-entry-${id} > a`);
  const target = link?.href ?? recipeRoutes[id];
  if (target) location.replace(new URL(target, location.href).href);
}
openLegacyEntry();
window.addEventListener("hashchange", openLegacyEntry);
