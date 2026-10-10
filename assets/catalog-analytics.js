import { normalizeSearch } from "./catalog-model.js";

// Only committed actions are searches: leaving the field, Enter, a category
// change, broadening or leaving the page. Pauses while typing are not failures.
export function createSearchTracker(report) {
  let lastKey = "";
  let emptySearch = null;
  return {
    reset() { lastKey = ""; emptySearch = null; },
    track({ query, category, products, journal, totalProducts }, trigger) {
      const normalized = normalizeSearch(query);
      if (!normalized) return;
      const key = `${category}:${normalized}`;
      if (key === lastKey) return;
      lastKey = key;
      const result = products ? "products" : totalProducts ? "other_category" : journal ? "journal_only" : "none";
      const params = { schema: 2, category, query_length: normalized.length, products, journal,
        total_products: totalProducts, result, trigger };
      report("catalog_search", params);
      if (!products) {
        report("catalog_search_empty", params);
        // Several unsuccessful attempts form one unresolved search episode.
        emptySearch ??= { query: normalized, category, result };
      } else if (emptySearch) {
        report("catalog_search_recovered", { ...params, previous_result: emptySearch.result,
          method: normalized !== emptySearch.query ? "query" : "category" });
        emptySearch = null;
      }
    },
  };
}
