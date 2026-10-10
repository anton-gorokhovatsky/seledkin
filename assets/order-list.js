import { catalog } from "./catalog-data.js";
import { catalogPrice, orderLinks, orderText, positionCount, productKey, restoreOrderKeys, orderUnit, orderAmount } from "./catalog-model.js";
import { typographText } from "./typography.js";
import { copyOrderMessage } from "./order-message.js";

export function setupOrderList() {
  const region = document.querySelector("#order-list");
  if (!region) return;
  const items = region.querySelector("[data-order-items]");
  const note = region.querySelector("[data-order-note]");
  const addButtons = [...document.querySelectorAll("[data-order-add]")];
  const removeButtons = [...document.querySelectorAll("[data-order-remove]")];
  const products = new Map(catalog.flatMap(category => category.items.map(product =>
    [productKey(category, product), { ...product, category: category.slug }])));
  const selected = new Set();
  const amounts = new Map();
  const storageKey = "seledkin-order-list";
  const amountStorageKey = "seledkin-order-amounts";
  let storageAvailable = true;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    for (const key of restoreOrderKeys(saved, catalog)) selected.add(key);
    if (selected.size) localStorage.setItem(storageKey, JSON.stringify([...selected]));
    const savedAmounts = JSON.parse(localStorage.getItem(amountStorageKey) ?? "{}");
    for (const key of selected) {
      const value = savedAmounts?.[key];
      if (typeof value === "string" && orderAmount(value, products.get(key))) amounts.set(key, value);
    }
  } catch { storageAvailable = false; }
  const title = region.querySelector("[data-catalog-order-title]");
  const copy = region.querySelector("[data-catalog-order-copy]");
  const channels = [...region.querySelectorAll(".catalog-order-actions a")];
  const nextStep = region.querySelector("[data-order-next]");
  const copyButton = region.querySelector("[data-order-copy-button]");
  const manualCopy = region.querySelector("[data-order-manual-copy]");
  const draftField = manualCopy.querySelector("textarea");
  const copyStatus = region.querySelector("[data-order-copy-status]");
  const desktopTelegram = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  let copiedDraft = "";
  const defaults = { title: title.textContent, copy: copy.textContent, urls: channels.map(a => a.href) };
  let needsHelp = false;
  const toolbar = document.querySelector(".catalog-result-line");
  const shortcut = document.createElement("a");
  shortcut.className = "catalog-order-shortcut";
  shortcut.href = "#order-list";
  shortcut.hidden = true;
  shortcut.innerHTML = '<span class="catalog-order-shortcut__label">Список заказа</span><span class="catalog-order-shortcut__count" aria-hidden="true"></span><svg viewBox="0 0 32 18" aria-hidden="true" focusable="false"><path d="M23 9H8.5C4.6 9 2.5 10.8 2.5 13.2c0 2.1 1.7 3.4 3.7 2.6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" /><path d="M19.5 3 30 9l-10.5 6 3.1-6-3.1-6Z" fill="currentColor" /></svg>';
  toolbar.append(shortcut);
  const updateClearance = () => {
    const clearance = shortcut.hidden ? 0 : innerHeight - shortcut.getBoundingClientRect().top + 16;
    document.documentElement.style.scrollPaddingBottom = `${clearance}px`;
  };
  new ResizeObserver(updateClearance).observe(shortcut);
  document.addEventListener("focusin", event => {
    if (shortcut.hidden || shortcut.contains(event.target) || !event.target.matches("a, button, input, select, textarea, summary")) return;
    requestAnimationFrame(() => {
      const target = event.target.getBoundingClientRect(), control = shortcut.getBoundingClientRect();
      if (target.right > control.left && target.left < control.right && target.bottom > control.top && target.top < control.bottom) {
        window.scrollBy({ top: target.bottom - control.top + 16, behavior: "instant" });
      }
    });
  });
  const status = document.createElement("p");
  status.className = "visually-hidden";
  status.setAttribute("role", "status");
  region.append(status);
  let orderVisible = false;
  const updateShortcut = () => { shortcut.hidden = !selected.size || orderVisible; updateClearance(); };
  if ("IntersectionObserver" in window) new IntersectionObserver(([entry]) => {
    orderVisible = entry.isIntersecting;
    updateShortcut();
  }).observe(region);

  const selection = () => [...selected].map(key => ({ ...products.get(key), amount: amounts.get(key) ?? "" }));
  function updateNote() {
    note.textContent = typographText(`${storageAvailable ? "Список сохранён в этом браузере." : "В этом браузере сохранение недоступно: список останется до закрытия или обновления страницы."} У фасованных товаров количество означает число упаковок.`);
  }
  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...selected]));
      localStorage.setItem(amountStorageKey, JSON.stringify(Object.fromEntries(amounts)));
      storageAvailable = true;
    } catch { storageAvailable = false; }
    updateNote();
  }
  function updateLinks() {
    const links = orderLinks(selection());
    channels.forEach((channel, index) => { channel.href = index === 0 ? links.telegram : links.whatsapp; });
    draftField.value = orderText(selection());
    copyStatus.textContent = "";
    copyButton.querySelector("span").textContent = "Скопировать список";
    copiedDraft = "";
  }
  function validAmounts() {
    const invalid = [...items.querySelectorAll("input")].find(input => !input.validity.valid);
    if (invalid) {
      invalid.dispatchEvent(new Event("blur"));
      invalid.focus();
    }
    return !invalid;
  }
  async function copyDraft() {
    const draft = orderText(selection());
    const copied = await copyOrderMessage(draft, { manualCopy, field: draftField, status: copyStatus });
    if (copied) {
      copiedDraft = draft;
      copyButton.querySelector("span").textContent = "Список скопирован";
      copyStatus.textContent = "Список скопирован. Вставьте его в сообщение в чате лавки.";
    }
    return copied;
  }
  // Show an invalid field before pointer activation: its error can otherwise
  // move the action underneath the pointer when the field loses focus.
  for (const action of [...channels, copyButton]) action.addEventListener("pointerdown", event => {
    if ([...items.querySelectorAll("input")].some(input => !input.validity.valid)) {
      event.preventDefault();
      validAmounts();
    }
  });
  for (const [index, channel] of channels.entries()) channel.addEventListener("click", async event => {
    if (!validAmounts()) { event.preventDefault(); return; }
    if (!selected.size || index !== 0 || !desktopTelegram || !manualCopy.hidden) return;
    event.preventDefault();
    if (copiedDraft === orderText(selection()) || await copyDraft()) {
      document.dispatchEvent(new CustomEvent("shop:goal", { detail: { goal: "order_click", params: {
        channel: "telegram", context: "order_list", count: selected.size,
        ...(new URL(location.href).searchParams.get("from") === "afisha" ? { source: "afisha" } : {}),
      } } }));
      window.location.assign(channel.href);
    }
    else channel.querySelector("span").textContent = "Открыть чат в Телеграме";
  });
  copyButton.addEventListener("click", async () => {
    if (!validAmounts()) return;
    await copyDraft();
  });

  function render() {
    const chosen = selection();
    for (const button of addButtons) {
      const isSelected = selected.has(button.value), product = products.get(button.value);
      button.dataset.selected = String(isSelected);
      button.querySelector("span").textContent = isSelected ? "Открыть список" : "В список заказа";
      button.setAttribute("aria-label", typographText(`${isSelected ? "Открыть список заказа" : "В список заказа"}: ${product.name}, ${catalogPrice(product.price)}`));
      const actions = button.closest(".catalog-product-actions");
      actions.hidden = false;
      actions.querySelector("[data-order-added]").hidden = !isSelected;
      actions.querySelector("[data-order-remove]").hidden = !isSelected;
    }
    items.replaceChildren();
    for (const key of selected) {
      const product = products.get(key);
      const row = document.createElement("li");
      const text = document.createElement("span");
      text.className = "catalog-order-item__product";
      const name = document.createElement("strong");
      name.textContent = typographText(product.name);
      const price = document.createElement("span");
      price.textContent = catalogPrice(product.price);
      text.append(name, price);
      const unit = orderUnit(product);
      const quantity = document.createElement("label");
      quantity.className = "catalog-order-quantity";
      const label = document.createElement("span");
      label.textContent = unit.label;
      const amount = document.createElement("input");
      amount.type = "text";
      amount.inputMode = unit.whole ? "numeric" : "decimal";
      amount.autocomplete = "off";
      amount.value = amounts.get(key) ?? "";
      amount.placeholder = `Например, ${unit.example}`;
      amount.setAttribute("aria-label", `${unit.label}: ${product.name}, ${catalogPrice(product.price)}`);
      const error = document.createElement("small");
      error.id = `order-amount-error-${key}`;
      error.textContent = unit.whole ? "Укажите целое число больше нуля или оставьте поле пустым."
        : "Укажите вес больше нуля, например 0,5, или оставьте поле пустым.";
      error.hidden = true;
      amount.setAttribute("aria-describedby", error.id);
      function validate(showError = false) {
        const value = orderAmount(amount.value, product);
        amount.setCustomValidity(value === null ? error.textContent : "");
        error.hidden = value !== null || !showError;
        if (!error.hidden) amount.setAttribute("aria-invalid", "true");
        else amount.removeAttribute("aria-invalid");
        value ? amounts.set(key, value) : amounts.delete(key);
        persist();
        updateLinks();
        return value;
      }
      amount.addEventListener("input", () => validate(amount.hasAttribute("aria-invalid")));
      amount.addEventListener("blur", () => {
        const value = validate(true);
        if (value !== null) amount.value = value;
      });
      quantity.append(label, amount, error);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Убрать";
      remove.setAttribute("aria-label", `Убрать из списка: ${product.name}, ${catalogPrice(product.price)}`);
      remove.addEventListener("click", () => {
        const next = row.nextElementSibling?.querySelector("button")?.getAttribute("aria-label")
          ?? row.previousElementSibling?.querySelector("button")?.getAttribute("aria-label");
        selected.delete(key);
        amounts.delete(key);
        update(`Убрано: ${product.name}`);
        const target = [...items.querySelectorAll("button")].find(button => button.getAttribute("aria-label") === next);
        (target ?? channels[0]).focus();
      });
      const header = document.createElement("div");
      header.className = "catalog-order-item__header";
      header.append(text, remove);
      row.append(header, quantity);
      items.append(row);
    }
    const hasItems = chosen.length > 0;
    region.dataset.hasItems = String(hasItems);
    items.hidden = note.hidden = !hasItems;
    nextStep.hidden = !hasItems;
    copyButton.hidden = !hasItems;
    if (!hasItems) { manualCopy.hidden = true; copyStatus.textContent = ""; }
    updateShortcut();
    shortcut.setAttribute("aria-label", typographText(`К списку заказа · ${positionCount(chosen.length)}`));
    shortcut.querySelector(".catalog-order-shortcut__count").textContent = String(chosen.length);
    if (hasItems) {
      title.textContent = "Список заказа";
      copy.textContent = "Проверьте выбранные товары. Вес и количество можно указать сейчас или дописать в сообщении.";
      updateNote();
      nextStep.textContent = typographText(desktopTelegram
        ? "Кнопка Телеграма скопирует список и откроет чат лавки. Вставьте текст в сообщение, допишите адрес доставки или самовывоз и отправьте его, чтобы уточнить наличие и оформить заказ."
        : "Откройте список в мессенджере, допишите адрес доставки или самовывоз и отправьте сообщение лавке. Если текст не появился, скопируйте список здесь и вставьте его в чат.");
      updateLinks();
      for (const [index, channel] of channels.entries()) {
        channel.dataset.orderListCount = String(chosen.length);
        channel.querySelector("span").textContent = index === 0 && desktopTelegram
          ? "Скопировать и открыть Телеграм" : `Открыть список в ${index === 0 ? "Телеграме" : "WhatsApp"}`;
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
    persist();
    render();
    status.textContent = typographText(`${message}. В списке ${positionCount(selected.size)}.${selected.size === 1 ? " Чтобы продолжить, откройте список заказа." : ""}`);
  }
  for (const button of addButtons) button.addEventListener("click", () => {
    if (selected.has(button.value)) {
      region.scrollIntoView({ block: "start", behavior: "instant" });
      region.focus({ preventScroll: true });
      return;
    }
    const wasEmpty = selected.size === 0;
    selected.add(button.value);
    if (wasEmpty) document.dispatchEvent(new CustomEvent("shop:goal", { detail: {
      goal: "product_select", params: { context: "order_list", action: "list_start", product_id: button.value,
        category: products.get(button.value).category, count: 1,
        ...(new URL(location.href).searchParams.get("from") === "afisha" ? { source: "afisha" } : {}) },
    } }));
    update(`Добавлено: ${products.get(button.value).name}`);
  });
  for (const button of removeButtons) button.addEventListener("click", () => {
    selected.delete(button.value);
    amounts.delete(button.value);
    update(`Убрано: ${products.get(button.value).name}`);
    addButtons.find(add => add.value === button.value).focus({ preventScroll: true });
  });
  shortcut.addEventListener("click", () => region.focus({ preventScroll: true }));
  render();
  return { setSearchState(state) { needsHelp = state.needsHelp; render(); } };
}
