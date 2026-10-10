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

test("a buyer builds one order with distinct packages, filters, persistence and keyboard removal @catalog", async ({ page }, testInfo) => {
  await page.goto("catalog/?q=черная+икра&audit=order-list");
  const products = page.locator(".catalog-product:visible");
  const first = products.filter({ hasText: "6 000" }).getByRole("checkbox");
  const second = products.filter({ hasText: "15 000" }).getByRole("checkbox");
  await first.press("Space");
  await second.check();
  const shortcut = page.getByRole("link", { name: "Список заказа · 2 позиции" });
  await expect(shortcut).toBeVisible();
  await page.getByRole("searchbox").fill("тунец");
  await expect(page.locator(".catalog-product:visible")).toHaveCount(1);
  await page.reload();
  await expect(shortcut).toBeVisible();
  await page.getByRole("searchbox").fill("несуществующийтовар");
  await expect(page.locator("#order-list").getByRole("heading", { name: "Список заказа" })).toBeVisible();
  await expect(page.locator("#order-list").getByRole("link", { name: "Отправить список в Телеграме" })).toBeVisible();
  await page.getByRole("searchbox").fill("тунец");
  await shortcut.press("Enter");
  const list = page.locator("#order-list");
  await expect(list).toBeFocused();
  await expect(list.getByRole("list")).toContainText("6 000 ₽ за 50 г");
  await expect(list.getByRole("list")).toContainText("15 000 ₽ за 125 г");
  const telegram = new URL(await list.getByRole("link", { name: "Отправить список в Телеграме" }).getAttribute("href"));
  const whatsapp = new URL(await list.getByRole("link", { name: "Отправить список в WhatsApp" }).getAttribute("href"));
  expect(telegram.searchParams.get("text")).toBe(whatsapp.searchParams.get("text"));
  expect(telegram.searchParams.get("text")).toContain("6 000 ₽ за 50 г");
  expect(telegram.searchParams.get("text")).toContain("15 000 ₽ за 125 г");
  await page.evaluate(() => document.documentElement.dataset.theme = "light");
  await auditOrderList(page);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.evaluate(() => document.documentElement.dataset.theme = "dark");
  await expect(list.getByRole("link", { name: "Отправить список в Телеграме" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await list.screenshot({ path: testInfo.outputPath("order-list-320-dark.png") });
  await auditOrderList(page);
  await list.getByRole("button", { name: /Убрать.*6\s000/ }).press("Enter");
  await expect(list.getByRole("button", { name: /Убрать.*15\s000/ })).toBeFocused();
  await list.getByRole("button", { name: /Убрать.*15\s000/ }).press("Enter");
  await expect(list.getByRole("heading", { name: "Нашли нужное?" })).toBeVisible();
  await expect(shortcut).toBeHidden();
  await expect(list.getByRole("link", { name: "Заказать в Телеграме", exact: true })).toBeFocused();
});

test("an existing saved order migrates to current product IDs @catalog", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("seledkin-order-list", JSON.stringify([
    "caviar|Черная икра|Осетровая (забойная) высшего качества|/0,05 кг",
    "caviar|Черная икра|Осетровая (забойная) высшего качества|/0,125 кг",
    "removed-product",
  ])));
  await page.goto("catalog/?q=черная+икра&audit=order-list");
  await expect(page.getByRole("link", { name: "Список заказа · 2 позиции" })).toBeVisible();
  await expect(page.locator(".catalog-product:visible").getByRole("checkbox", { checked: true })).toHaveCount(2);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("seledkin-order-list")))).toEqual(["caviar-001", "caviar-002"]);
  await expect(page.locator("#order-list").getByRole("list")).toContainText("15 000 ₽ за 125 г");
});

test("blocked storage leaves the order list usable during a visit @catalog", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("Storage blocked"); } });
  });
  await page.goto("catalog/?q=тунец&audit=order-list");
  await page.locator(".catalog-product:visible").getByRole("checkbox").check();
  await page.getByRole("link", { name: "Список заказа · 1 позиция" }).click();
  const draft = new URL(await page.locator("#order-list").getByRole("link", { name: "Отправить список в Телеграме" }).getAttribute("href"));
  expect(draft.searchParams.get("text")).toContain("Филе тунца");
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
