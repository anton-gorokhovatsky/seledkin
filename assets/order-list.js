import { catalog } from "./catalog-data.js";
import { catalogPrice, orderLinks, positionCount, productKey, restoreOrderKeys } from "./catalog-model.js";
import { typographText } from "./typography.js";

export function setupOrderList() {
  const region = document.querySelector("#order-list");
  if (!region) return;
  const items = region.querySelector("[data-order-items]");
  const note = region.querySelector("[data-order-note]");
  const inputs = [...document.querySelectorAll("[data-order-add]")];
  const products = new Map(catalog.flatMap(category => category.items.map(product =>
    [productKey(category, product), { ...product, category: category.slug }])));
  const selected = new Set();
  const storageKey = "seledkin-order-list";
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    for (const key of restoreOrderKeys(saved, catalog)) selected.add(key);
    if (selected.size) localStorage.setItem(storageKey, JSON.stringify([...selected]));
  } catch { /* The list still works during this visit when storage is blocked. */ }
  const title = region.querySelector("[data-catalog-order-title]");
  const copy = region.querySelector("[data-catalog-order-copy]");
  const channels = [...region.querySelectorAll(".catalog-order-actions a")];
  const defaults = { title: title.textContent, copy: copy.textContent, urls: channels.map(a => a.href) };
  let needsHelp = false;
  const toolbar = document.querySelector(".catalog-result-line");
  const shortcut = document.createElement("a");
  shortcut.className = "catalog-order-shortcut";
  shortcut.href = "#order-list";
  shortcut.hidden = true;
  shortcut.innerHTML = '<span></span><svg viewBox="0 0 32 18" aria-hidden="true" focusable="false"><use href="#icon-harpoon"></use></svg>';
  toolbar.append(shortcut);
  const status = document.createElement("p");
  status.className = "visually-hidden";
  status.setAttribute("role", "status");
  region.append(status);

  function render() {
    const selection = [...selected].map(key => products.get(key));
    for (const input of inputs) { input.checked = selected.has(input.value); input.closest("label").hidden = false; }
    items.replaceChildren();
    for (const key of selected) {
      const product = products.get(key);
      const row = document.createElement("li");
      const text = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = typographText(product.name);
      const price = document.createElement("span");
      price.textContent = catalogPrice(product.price);
      text.append(name, price);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Убрать";
      remove.setAttribute("aria-label", `Убрать из списка: ${product.name}, ${catalogPrice(product.price)}`);
      remove.addEventListener("click", () => {
        const next = row.nextElementSibling?.querySelector("button")?.getAttribute("aria-label")
          ?? row.previousElementSibling?.querySelector("button")?.getAttribute("aria-label");
        selected.delete(key);
        update(`Убрано: ${product.name}`);
        const target = [...items.querySelectorAll("button")].find(button => button.getAttribute("aria-label") === next);
        (target ?? channels[0]).focus();
      });
      row.append(text, remove);
      items.append(row);
    }
    const hasItems = selection.length > 0;
    items.hidden = note.hidden = !hasItems;
    shortcut.hidden = !hasItems;
    shortcut.querySelector("span").textContent = typographText(`Список заказа · ${positionCount(selection.length)}`);
    if (hasItems) {
      title.textContent = "Список заказа";
      copy.textContent = "Выбрано в каталоге:";
      const links = orderLinks(selection);
      for (const [index, channel] of channels.entries()) {
        channel.href = index === 0 ? links.telegram : links.whatsapp;
        channel.dataset.orderListCount = String(selection.length);
        channel.querySelector("span").textContent = `Отправить список в ${index === 0 ? "Телеграме" : "WhatsApp"}`;
      }
    } else {
      title.textContent = needsHelp ? "Помочь с выбором?" : defaults.title;
      copy.textContent = needsHelp ? "Напишите, что ищете: уточним наличие и подскажем подходящие продукты." : defaults.copy;
      for (const [index, channel] of channels.entries()) {
        channel.href = defaults.urls[index];
        delete channel.dataset.orderListCount;
        channel.querySelector("span").textContent = `${needsHelp ? "Спросить" : "Заказать"} в ${index === 0 ? "Телеграме" : "WhatsApp"}`;
      }
    }
  }
  function update(message) {
    try { localStorage.setItem(storageKey, JSON.stringify([...selected])); } catch {}
    render();
    status.textContent = typographText(`${message}. В списке ${positionCount(selected.size)}.`);
  }
  for (const input of inputs) input.addEventListener("change", () => {
    input.checked ? selected.add(input.value) : selected.delete(input.value);
    update(`${input.checked ? "Добавлено" : "Убрано"}: ${products.get(input.value).name}`);
  });
  shortcut.addEventListener("click", () => region.focus({ preventScroll: true }));
  render();
  return { setSearchState(state) { needsHelp = state.needsHelp; render(); } };
}
