import { test, expect } from "@playwright/test";

test("the owner price list keeps new packages exact and unpriced products out of the catalog @catalog", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("catalog/?category=caviar&audit=owner-prices");
  const roe = page.locator("#product-pink-salmon-roe-125");
  await expect(roe.locator("strong")).toHaveText("2 500 ₽ за 125 г");
  await expect(page.locator("#product-pike-roe-112 strong")).toHaveText("1 800 ₽ за 112 г");
  await expect(page.locator("#product-caviar-008, #product-caviar-009, #product-frozen-fish-008")).toHaveCount(0);
  await roe.locator("summary").click();
  for (const link of await roe.locator('.catalog-product-order__channels a:not([href^="tel:"])').all()) {
    const draft = new URL(await link.getAttribute("href")).searchParams.get("text");
    expect(draft).toContain("Икра горбуши");
    expect(draft).toContain("2 500 ₽ за 125 г");
    expect(draft).not.toContain("140");
  }
  await roe.locator("summary").click();
  await page.locator("#product-muksun-roe-230").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("owner-prices-caviar-1440.png") });
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.goto("catalog/?category=prepared-meals&audit=owner-prices-reflow");
  await page.addStyleTag({ content: `html { font-size: 200% !important; }
    * { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; }
    p { margin-bottom: 2em !important; }` });
  await expect(page.locator(".catalog-product:visible")).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.locator("#product-zander-aspic-300").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("owner-prices-meals-320-text-200.png") });
});

test("a short desktop shows a first product and keeps package choice separate from its actions @catalog", async ({ page }, testInfo) => {
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
    // The package selector has its own row. On a low viewport the controls
    // remain reachable by normal scrolling, without crowding the selector.
    const family = page.locator('[data-product-family="black-caviar"]');
    const lastWeight = await family.locator("label").last().boundingBox();
    const action = await order.boundingBox();
    expect(action.y).toBeGreaterThanOrEqual(lastWeight.y + lastWeight.height);
    expect(action.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    if (width === 1280) {
      await order.focus();
      await expect(order).toBeInViewport({ ratio: 1 });
      await page.screenshot({ path: testInfo.outputPath("catalog-1280-720.png") });
      await page.evaluate(() => scrollTo(0, 0));
    }
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
  expect(draft).toContain("2 490 ₽/кг");
  expect(draft).not.toContain("ккал");
});
