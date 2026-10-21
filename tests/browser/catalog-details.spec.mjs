import { test, expect } from "@playwright/test";

test("a short desktop catalog shows a first product, price and order action before scrolling @catalog", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("catalog/");
  await page.getByRole("button", { name: "Открыть меню", exact: true }).click();
  await page.getByRole("radio", { name: "Дневная", exact: true }).check();
  await page.keyboard.press("Escape");
  for (const width of [1024, 1280, 1366, 1440]) {
    await page.setViewportSize({ width, height: 720 });
    await page.evaluate(() => document.fonts.ready);
    const first = page.locator(".catalog-product:visible").first();
    await expect(first.getByRole("heading")).toBeInViewport({ ratio: 1 });
    await expect(first.locator("strong")).toBeInViewport({ ratio: 1 });
    const order = first.getByRole("button", { name: /^В список заказа:/ });
    await expect(order).toBeInViewport({ ratio: 1 });
    const action = await order.boundingBox();
    expect(action.y + action.height).toBeLessThanOrEqual(704);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    if (width === 1280) await page.screenshot({ path: testInfo.outputPath("catalog-1280-720.png") });
  }
  await page.getByRole("combobox", { name: "Категория", exact: true }).selectOption("chilled-fish");
  await expect(page.locator(".catalog-product:visible")).toContainText(["Форель"]);
  await page.getByRole("searchbox", { name: "Найти товар" }).fill("форель");
  await expect(page.locator("#product-chilled-trout")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("product facts remain legible beside prices and advice through catalog reflow @catalog", async ({ page }, testInfo) => {
  for (const [width, category] of [[1440, "fillet"], [980, "fillet"], [390, "fillet"], [320, "fillet"], [320, "seafood"], [320, "frozen-fish"]]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`catalog/?category=${category}&audit=product-details`);
    if (width === 320) await page.addStyleTag({ content: `
      html { font-size: 200% !important; }
      * { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; }
      p { margin-bottom: 2em !important; }
    ` });
    await page.evaluate(() => document.fonts.ready);
    const product = page.locator(category === "fillet" ? "#product-fillet-001" : category === "seafood" ? "#product-seafood-014" : "#product-frozen-fish-033");
    await expect(product.locator(".catalog-product-calories")).toHaveText(`${category === "fillet" ? 77 : category === "seafood" ? 97 : 96} ккал на 100 г`);
    for (const theme of ["light", "dark"]) {
      await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      const outside = await page.locator(".catalog-product:visible :is(.catalog-product-facts, .catalog-product-calories)").evaluateAll(nodes => nodes.filter(node => {
        const range = document.createRange(); range.selectNodeContents(node);
        const box = node.getBoundingClientRect();
        return [...range.getClientRects()].some(line => line.left < box.left - 1 || line.right > box.right + 1);
      }).map(node => node.textContent));
      expect(outside).toEqual([]);
      await product.scrollIntoViewIfNeeded();
      if (width !== 980) await page.screenshot({ path: testInfo.outputPath(`details-${category}-${width}-${theme}.png`) });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("catalog/?category=fillet&q=без+кожи&audit=product-details");
  await expect(page.locator(".catalog-product:visible")).toHaveCount(2);
  await page.locator("#product-fillet-001 [data-order-add]").press("Enter");
  const list = page.locator("#order-list");
  await expect(list.getByRole("textbox", { name: /Вес.*Филе трески/ })).toBeVisible();
  const draft = new URL(await list.getByRole("link", { name: "Открыть список в WhatsApp" }).getAttribute("href")).searchParams.get("text");
  expect(draft).toContain("Филе трески");
  expect(draft).toContain("2 480 ₽/кг");
  expect(draft).not.toContain("ккал");
});
