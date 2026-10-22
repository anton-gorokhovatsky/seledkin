import { catalogVisibleSize } from "../helpers/catalog.mjs";
import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { stubStoreMap } from "./map-fixture.mjs";

const require = createRequire(import.meta.url);
async function auditOrderList(page) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  expect(await page.evaluate(async () => (await axe.run("#order-list", {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] },
  })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })))).toEqual([]);
}

test("the order shortcut keeps its label, count and harpoon together on narrow screens @catalog", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.addInitScript(() => localStorage.setItem("seledkin-order-list", JSON.stringify([
    "caviar-001", "caviar-002", "caviar-003", "caviar-004", "caviar-005", "trout-roe",
    "caviar-007", "pink-salmon-roe-125", "pike-roe-112", "seafood-001", "seafood-002",
  ])));
  await page.goto("catalog/?audit=order-shortcut");
  const shortcut = page.getByRole("link", { name: "К списку заказа · 11 позиций" });
  for (const theme of ["light", "dark"]) {
    await page.evaluate(theme => localStorage.setItem("seledkin-theme", theme), theme);
    await page.reload();
    await expect(shortcut).toBeVisible();
    await expect(shortcut.locator(".catalog-order-shortcut__count")).toHaveText("11");
    const layout = await shortcut.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return { height: rect.height, left: rect.left, right: rect.right, harpoon: el.querySelector("svg").getBBox().width };
    });
    expect(layout.height).toBeGreaterThanOrEqual(44);
    expect(layout.height).toBeLessThan(65);
    expect(layout.left).toBeGreaterThanOrEqual(0);
    expect(layout.right).toBeLessThanOrEqual(320);
    expect(layout.harpoon).toBeGreaterThan(20);
    await page.screenshot({ path: testInfo.outputPath(`order-shortcut-320-${theme}.png`) });
  }
  await page.evaluate(() => document.documentElement.style.fontSize = "200%");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  const enlarged = await shortcut.boundingBox();
  const enlargedParts = await shortcut.evaluate(el => {
    const label = el.querySelector(".catalog-order-shortcut__label"), count = el.querySelector(".catalog-order-shortcut__count"), arrow = el.querySelector("svg");
    return { label: label.getBoundingClientRect().toJSON(), count: count.getBoundingClientRect().toJSON(), arrow: arrow.getBoundingClientRect().toJSON(), lineHeight: parseFloat(getComputedStyle(label).lineHeight) };
  });
  expect(enlargedParts.label.height).toBeLessThanOrEqual(enlargedParts.lineHeight * 2 + 1);
  expect(enlargedParts.label.right).toBeLessThan(enlargedParts.count.left);
  expect(enlargedParts.count.right).toBeLessThan(enlargedParts.arrow.left);
  expect(enlarged.x + enlarged.width).toBeLessThanOrEqual(320);
  const heading = await page.locator("main h1").evaluate(el => {
    const text = document.createRange(); text.selectNodeContents(el);
    return [...text.getClientRects()].map(rect => ({ left: rect.left, right: rect.right }));
  });
  for (const line of heading) {
    expect(line.left).toBeGreaterThanOrEqual(0);
    expect(line.right).toBeLessThanOrEqual(320);
  }
  await page.screenshot({ path: testInfo.outputPath("order-shortcut-320-large-text.png") });
  const selection = page.locator("[data-order-add]").first();
  await selection.focus();
  await expect.poll(async () => {
    const item = await selection.boundingBox(), control = await shortcut.boundingBox();
    return item.y + item.height <= control.y;
  }).toBe(true);
  await shortcut.press("Enter");
  await expect(page.locator("#order-list")).toBeFocused();
});

test("a buyer builds one order with distinct packages, filters, persistence and keyboard removal @catalog", async ({ page }, testInfo) => {
  await page.goto("catalog/?q=черная+икра&audit=order-list");
  const first = page.locator("#product-caviar-001 [data-order-add]");
  const second = page.locator("#product-caviar-002 [data-order-add]");
  await first.press("Space");
  await page.locator('label[for="package-caviar-002"]').click();
  await second.click();
  await expect(page.getByRole("link", { name: "К списку заказа · 2 позиции" })).toBeVisible();
  const list = page.locator("#order-list");
  await second.press("Enter");
  await expect(list).toBeFocused();
  await expect(list.locator("li")).toHaveCount(2);
  await list.getByRole("textbox", { name: /Количество.*6\s000/ }).fill("2");
  await list.getByRole("textbox", { name: /Количество.*15\s000/ }).fill("1");
  const shortcut = page.getByRole("link", { name: "К списку заказа · 2 позиции" });
  await expect(list.getByRole("textbox", { name: /Количество.*6\s000/ })).toHaveValue("2");
  await page.getByRole("searchbox").fill("филе тунца");
  await expect(page.locator(".catalog-product:visible")).toHaveCount(1);
  await page.reload();
  await expect(list.getByRole("textbox", { name: /Количество.*6\s000/ })).toHaveValue("2");
  await page.getByRole("searchbox").fill("несуществующийтовар");
  await expect(page.locator("#order-list").getByRole("heading", { name: "Список заказа" })).toBeVisible();
  await expect(page.locator("#order-list").getByRole("link", { name: "Скопировать и открыть Телеграм" })).toBeVisible();
  await page.getByRole("searchbox").fill("");
  await shortcut.press("Enter");
  await expect(list).toBeFocused();
  await expect(list.getByRole("list")).toContainText("6 000 ₽ за 50 г");
  await expect(list.getByRole("list")).toContainText("15 000 ₽ за 125 г");
  const telegram = new URL(await list.getByRole("link", { name: "Скопировать и открыть Телеграм" }).getAttribute("href"));
  const whatsapp = new URL(await list.getByRole("link", { name: "Открыть список в WhatsApp" }).getAttribute("href"));
  expect(telegram.searchParams.get("text")).toBe(whatsapp.searchParams.get("text"));
  expect(telegram.searchParams.get("text")).toContain("6 000 ₽ за 50 г");
  expect(telegram.searchParams.get("text")).toContain("15 000 ₽ за 125 г");
  expect(telegram.searchParams.get("text")).toContain("Количество: 2 шт.");
  await expect(list.locator("[data-order-note]")).toContainText("Список сохранён в этом браузере");
  await page.evaluate(() => document.documentElement.dataset.theme = "light");
  await auditOrderList(page);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.evaluate(() => document.documentElement.dataset.theme = "dark");
  await expect(list.getByRole("link", { name: "Скопировать и открыть Телеграм" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await list.screenshot({ path: testInfo.outputPath("order-list-320-dark.png") });
  const header = list.locator(".catalog-order-item__header").first();
  const aligned = await header.evaluate(el => {
    const product = el.querySelector("strong").getBoundingClientRect();
    const remove = el.querySelector("button").getBoundingClientRect();
    return { difference: Math.abs(product.top - remove.top), removeBottom: remove.bottom, quantityTop: el.nextElementSibling.getBoundingClientRect().top };
  });
  expect(aligned.difference).toBeLessThan(10);
  expect(aligned.removeBottom).toBeLessThanOrEqual(aligned.quantityTop);
  await auditOrderList(page);
  await list.getByRole("button", { name: /Убрать.*6\s000/ }).press("Enter");
  await expect(list.getByRole("button", { name: /Убрать.*15\s000/ })).toBeFocused();
  await list.getByRole("button", { name: /Убрать.*15\s000/ }).press("Enter");
  await expect(list.getByRole("heading", { name: "Нашли нужное?" })).toBeVisible();
  await expect(shortcut).toBeHidden();
  await expect(list.getByRole("link", { name: "Заказать в Телеграме", exact: true })).toBeFocused();
});

test("same-name fish retain their origin in the list, accessible controls and draft @catalog", async ({ page }) => {
  await page.goto("catalog/?q=корюшка&category=frozen-fish&audit=order-origins");
  await page.evaluate(() => document.fonts.ready);
  const sakhalin = page.locator("#product-frozen-fish-010 [data-order-add]");
  const petersburg = page.locator("#product-frozen-fish-015 [data-order-add]");
  await sakhalin.press("Enter");
  await expect(page.getByRole("button", { name: /^Открыть список заказа: Корюшка, Сахалин/ })).toHaveAttribute("data-selected", "true");
  // Linux WebKit can finish its focus scroll between mouse down and up.
  // Establish focus first, then keep the actual pointer activation and result.
  await petersburg.focus();
  await expect(petersburg).toBeFocused();
  // Let WebKit finish native focus scrolling and the scheduled focus clearance
  // before pointer down/up; the subsequent click must still add the second fish.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await petersburg.click();
  const list = page.locator("#order-list");
  await expect(list.locator("li")).toHaveCount(2);
  await expect(list.locator("li").nth(0)).toContainText("Сахалин");
  await expect(list.locator("li").nth(1)).toContainText("Санкт-Петербург");
  await list.getByRole("textbox", { name: /^Вес, кг: Корюшка, Сахалин/ }).fill("0,5");
  await list.getByRole("textbox", { name: /^Вес, кг: Корюшка, Санкт-Петербург/ }).fill("1");
  await page.reload();
  await expect(list.getByRole("textbox", { name: /^Вес, кг: Корюшка, Сахалин/ })).toHaveValue("0,5");
  await expect(list.getByRole("textbox", { name: /^Вес, кг: Корюшка, Санкт-Петербург/ })).toHaveValue("1");
  const draft = new URL(await list.getByRole("link", { name: "Открыть список в WhatsApp" }).getAttribute("href")).searchParams.get("text");
  expect(draft).toContain("Сахалин");
  expect(draft).toContain("Санкт-Петербург");
  await list.getByRole("button", { name: /^Убрать из списка: Корюшка, Сахалин/ }).press("Enter");
  await expect(list.locator("li")).toHaveCount(1);
  await expect(list.locator("li")).toContainText("Санкт-Петербург");
  await expect(list.getByRole("button", { name: /^Убрать из списка: Корюшка, Санкт-Петербург/ })).toBeFocused();
});

test("two catalog tabs share products and amounts without losing an active field @catalog", async ({ page, context }, testInfo) => {
  const other = await context.newPage();
  await page.goto("catalog/?product=caviar-001&audit=order-tabs");
  await other.goto("catalog/?product=seafood-009&audit=order-tabs");
  const firstList = page.locator("#order-list");
  const otherList = other.locator("#order-list");
  await page.locator(".catalog-product:visible [data-order-add]").click();
  await expect(otherList.locator("li")).toHaveCount(1);
  const quantity = firstList.getByRole("textbox", { name: /^Количество.*Черная икра/ });
  await quantity.fill("2");
  await expect(quantity).toBeFocused();
  await other.locator(".catalog-product:visible [data-order-add]").click();
  await expect(firstList.locator("li")).toHaveCount(2);
  await expect(quantity).toBeFocused();
  await expect(quantity).toHaveValue("2");
  const weight = otherList.getByRole("textbox", { name: /^Вес.*Мясо мидий/ });
  await weight.fill("0,5");
  await weight.press("Tab");
  await expect(firstList.getByRole("textbox", { name: /^Вес.*Мясо мидий/ })).toHaveValue("0,5");
  await page.reload();
  await expect(firstList.locator("li")).toHaveCount(2);
  await expect(quantity).toHaveValue("2");
  await quantity.focus();
  await otherList.getByRole("textbox", { name: /^Количество.*Черная икра/ }).fill("4");
  await expect(quantity).toHaveValue("4");
  await expect(quantity).toBeFocused();
  // A remote update must not silently clear an invalid local entry.
  await quantity.fill("0");
  await weight.fill("1");
  await expect(quantity).toHaveValue("0");
  await expect(quantity).toBeFocused();
  await expect(firstList.getByRole("textbox", { name: /^Вес.*Мясо мидий/ })).toHaveValue("1");
  await quantity.fill("3");
  await otherList.getByRole("button", { name: /^Убрать.*Черная икра/ }).click();
  await expect(firstList.locator("li")).toHaveCount(1);
  await other.reload();
  await expect(otherList.locator("li")).toHaveCount(1);
  await expect(otherList).toContainText("Мясо мидий");
  await page.screenshot({ path: testInfo.outputPath("shared-order-tabs.png") });
  await other.close();
});

test("an existing saved order migrates to current product IDs @catalog", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("seledkin-order-list", JSON.stringify([
    "caviar|Черная икра|Осетровая (забойная) высшего качества|/0,05 кг",
    "caviar|Черная икра|Осетровая (забойная) высшего качества|/0,125 кг",
    "removed-product",
  ])));
  await page.goto("catalog/?q=черная+икра&audit=order-list");
  await expect(page.getByRole("link", { name: "К списку заказа · 2 позиции" })).toBeVisible();
  await expect(page.locator(".catalog-product [data-order-add][data-selected=\"true\"]")).toHaveCount(2);
  await expect(page.locator(".catalog-product:visible [data-order-add][data-selected=\"true\"]")).toHaveCount(1);
  await page.locator('label[for="package-caviar-002"]').click();
  await expect(page.locator("#product-caviar-002 [data-order-add]")).toHaveAttribute("data-selected", "true");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("seledkin-order-list")))).toEqual(["caviar-001", "caviar-002"]);
  await expect(page.locator("#order-list").getByRole("list")).toContainText("15 000 ₽ за 125 г");
});

test("blocked storage leaves the order list usable during a visit @catalog", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("Storage blocked"); } });
  });
  await page.goto("catalog/?q=филе+тунца&audit=order-list");
  await expect(page.locator(".catalog-product:visible")).toHaveCount(1);
  await page.locator(".catalog-product:visible").locator("[data-order-add]").click();
  await page.locator("#order-list").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-order-note]")).toContainText("сохранение недоступно");
  const draft = new URL(await page.locator("#order-list").getByRole("link", { name: "Скопировать и открыть Телеграм" }).getAttribute("href"));
  expect(draft.searchParams.get("text")).toContain("Филе тунца");
});

test("desktop handoff copies the full list before opening Telegram @catalog", async ({ page }, testInfo) => {
  let copiedOrder;
  await page.exposeFunction("captureCopiedOrder", text => { copiedOrder = text; });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    localStorage.setItem("seledkin-order-list", JSON.stringify(["caviar-001", "caviar-004", "pike-roe-112", "seafood-002", "frozen-fish-004", "other-003"]));
    localStorage.setItem("seledkin-order-amounts", JSON.stringify({"caviar-001":"2", "seafood-002":"0,5"}));
    Object.defineProperty(navigator, "clipboard", { value: { async writeText(text) { await window.captureCopiedOrder(text); } } });
  });
  await page.route("https://t.me/**", route => route.fulfill({ contentType: "text/html", body: "<p>Telegram contact landing fixture</p>" }));
  await page.goto("catalog/?audit=order-list#order-list");
  const list = page.locator("#order-list");
  await expect(list.getByRole("textbox", { name: /Вес.*Мясо краба/ })).toHaveValue("0,5");
  await list.screenshot({ path: testInfo.outputPath("order-list-1440-light.png") });
  const expected = new URL(await list.getByRole("link", { name: "Скопировать и открыть Телеграм" }).getAttribute("href")).searchParams.get("text");
  await list.getByRole("link", { name: "Скопировать и открыть Телеграм" }).click();
  await expect(page).toHaveURL(/^https:\/\/t\.me\//);
  expect(copiedOrder).toBe(expected);
  expect(expected).toContain("Количество: 2 шт.");
  expect(expected).toContain("Вес: 0,5 кг");
  expect(expected).toContain("Корюшка");
  expect(expected).toContain("Сахалин");
});

test("denied copying leaves the draft selectable and invalid weight blocks handoff @catalog", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: { async writeText() { throw new Error("Clipboard denied"); } } });
  });
  await page.goto("catalog/?product=fillet-006&audit=order-list#product-fillet-006");
  await page.locator(".catalog-product:visible").locator("[data-order-add]").click();
  const list = page.locator("#order-list");
  const weight = list.getByRole("textbox", { name: /Вес.*Филе тунца/ });
  await weight.fill("0");
  await list.getByRole("link", { name: "Скопировать и открыть Телеграм" }).click();
  await expect(weight).toBeFocused();
  await expect(weight).toHaveAttribute("aria-invalid", "true");
  await weight.fill("0,5");
  await list.getByRole("link", { name: "Скопировать и открыть Телеграм" }).click();
  const draft = list.getByRole("textbox", { name: "Текст для сообщения" });
  await expect(draft).toBeVisible();
  await expect(draft).toBeFocused();
  expect(await draft.inputValue()).toContain("Вес: 0,5 кг");
  expect(await draft.evaluate(field => field.selectionEnd - field.selectionStart)).toBe((await draft.inputValue()).length);
  await expect(list.getByRole("link", { name: "Открыть чат в Телеграме" })).toBeVisible();
  await expect(page).toHaveURL(/catalog\//);
});

test("a desktop single-product request copies its package before opening Telegram @catalog", async ({ page }) => {
  let copied;
  await page.exposeFunction("captureProductRequest", text => { copied = text; });
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: {
    async writeText(text) { await window.captureProductRequest(text); },
  } }));
  await page.route("https://t.me/**", route => route.fulfill({ contentType: "text/html", body: "<p>Telegram contact landing fixture</p>" }));
  await page.goto("catalog/?product=caviar-001&audit=product-order#product-caviar-001");
  const product = page.locator("#product-caviar-001");
  await product.locator("summary").click();
  const telegram = product.getByRole("link", { name: "Скопировать и открыть Телеграм" });
  const expected = new URL(await telegram.getAttribute("href")).searchParams.get("text");
  await expect(product).toContainText("Вставьте скопированный текст");
  await telegram.click();
  await expect(page).toHaveURL(/^https:\/\/t\.me\/\+79166751452/);
  expect(copied).toBe(expected);
  expect(copied).toContain("6 000 ₽ за 50 г");
});

test("a denied single-product copy retains the full selectable request @catalog", async ({ page }, testInfo) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: {
    async writeText() { throw new Error("Clipboard denied"); },
  } }));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("catalog/?product=fillet-006&audit=product-order#product-fillet-006");
  const product = page.locator("#product-fillet-006");
  await expect(product).toBeFocused();
  // Test the clipboard denial and keyboard recovery independently of WebKit's
  // delayed anchor scrolling. The preceding request test covers pointer use.
  await product.locator("summary").press("Enter");
  await product.getByRole("link", { name: "Скопировать и открыть Телеграм" }).press("Enter");
  const field = product.getByRole("textbox", { name: "Текст для сообщения" });
  await expect(field).toBeFocused();
  expect(await field.inputValue()).toContain("Филе тунца");
  expect(await field.evaluate(el => el.selectionEnd - el.selectionStart)).toBe((await field.inputValue()).length);
  await expect(product.getByRole("link", { name: "Открыть чат в Телеграме" })).toBeVisible();
  await expect(page).toHaveURL(/catalog\//);
  await product.screenshot({ path: testInfo.outputPath("single-product-copy-fallback.png") });
});

test("a homepage price opens its exact package and keeps normal catalog navigation @catalog", async ({ page }) => {
  await page.goto("?audit=order-list");
  await page.locator(".price-preview").getByRole("link", { name: "Чёрная икра" }).click();
  await expect(page.locator(".catalog-product:visible")).toHaveCount(1);
  await expect(page.locator("#product-caviar-001")).toContainText("6 000 ₽ за 50 г");
  await expect(page.locator('[data-product-family="black-caviar"]')).toBeFocused();
  // Anchor scrolling in WebKit can move the pointer target between press and
  // release. This history scenario uses the keyboard; reset clicks are covered
  // by catalog-journal.spec.mjs.
  await page.getByRole("button", { name: "Весь каталог", exact: true }).press("Enter");
  await expect(page.locator(".catalog-product:visible")).toHaveCount(catalogVisibleSize);
  await page.goBack();
  await expect(page.locator(".catalog-product:visible")).toHaveCount(1);
  await expect(page.locator('[data-product-family="black-caviar"]')).toBeFocused();
});

test("contacts retain the address and map action with 200 percent text @contacts", async ({ page }, testInfo) => {
  await stubStoreMap(page);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("?audit=contacts#contacts");
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    const card = page.locator(".contacts-source__card");
    const action = card.getByRole("link", { name: "Открыть в Яндекс Картах" });
    await action.focus();
    const bounds = await card.evaluate(card => {
      const link = card.querySelector("a");
      const text = document.createRange(); text.selectNodeContents(link);
      const box = link.getBoundingClientRect(), glyphs = text.getBoundingClientRect();
      return { card: card.getBoundingClientRect().toJSON(), box: box.toJSON(), glyphs: glyphs.toJSON(), overflow: link.scrollWidth - link.clientWidth };
    });
    expect(bounds.overflow).toBeLessThanOrEqual(1);
    expect(bounds.glyphs.height).toBeLessThan(bounds.box.height);
    expect(bounds.box.right).toBeLessThanOrEqual(width);
    expect(bounds.box.left).toBeGreaterThanOrEqual(0);
    await expect(card).toContainText("Вавиловская");
    await expect(card).toContainText("Университет");
    await card.screenshot({ path: testInfo.outputPath(`contacts-${width}-text200.png`) });
  }
});
