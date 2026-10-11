import { orderAmount, restoreOrderKeys } from "./catalog-model.js";

export const orderStoragePrefix = "seledkin-order-item:";
const formatKey = "seledkin-order-format";

// Each product is one atomic storage entry. Two tabs adding different products
// cannot overwrite one another's list or quantities.
export function createOrderStore(products, catalog, getStorage = () => localStorage) {
  let entries = new Map(), available = true;
  function read() {
    if (available) try {
      const storage = getStorage();
      if (storage.getItem(formatKey) !== "2") {
        const keys = restoreOrderKeys(JSON.parse(storage.getItem("seledkin-order-list") ?? "[]"), catalog);
        const amounts = JSON.parse(storage.getItem("seledkin-order-amounts") ?? "{}");
        entries = new Map(keys.map((key, index) => [key, {
          amount: orderAmount(amounts?.[key] ?? "", products.get(key)) ?? "",
          addedAt: Date.now() + index / 1000,
        }]));
        for (const [key, entry] of entries) storage.setItem(orderStoragePrefix + key, JSON.stringify(entry));
        storage.setItem(formatKey, "2");
        mirror(storage);
      }
      const saved = [];
      for (const [key, product] of products) {
        const raw = storage.getItem(orderStoragePrefix + key);
        if (raw === null) continue;
        try {
          const entry = JSON.parse(raw);
          const amount = typeof entry.amount === "string" ? orderAmount(entry.amount, product) : null;
          if (amount !== null && Number.isFinite(entry.addedAt)) saved.push([key, { amount, addedAt: entry.addedAt }]);
        } catch { /* Ignore a damaged entry without losing the rest of the list. */ }
      }
      entries = new Map(saved.sort((a, b) => a[1].addedAt - b[1].addedAt));
      available = true;
    } catch { available = false; }
    return { selected: new Set(entries.keys()), amounts: new Map([...entries].filter(([, entry]) => entry.amount).map(([key, entry]) => [key, entry.amount])) };
  }
  function mirror(storage) {
    // Retain the legacy snapshot for compatibility; reads use atomic entries.
    storage.setItem("seledkin-order-list", JSON.stringify([...entries.keys()]));
    storage.setItem("seledkin-order-amounts", JSON.stringify(Object.fromEntries([...entries].filter(([, entry]) => entry.amount).map(([key, entry]) => [key, entry.amount]))));
  }
  function change(key, amount) {
    read();
    if (amount === null) entries.delete(key);
    else entries.set(key, { amount, addedAt: entries.get(key)?.addedAt ?? Date.now() });
    if (!available) return;
    try {
      const storage = getStorage();
      if (amount === null) storage.removeItem(orderStoragePrefix + key);
      else storage.setItem(orderStoragePrefix + key, JSON.stringify(entries.get(key)));
      read();
      mirror(storage);
      available = true;
    } catch { available = false; }
  }
  return { read, set: (key, amount = "") => change(key, amount), remove: key => change(key, null),
    get available() { return available; },
    isStorageEvent: event => event.key === null || event.key === formatKey || event.key.startsWith(orderStoragePrefix),
  };
}
