import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

test.beforeEach(async ({ context }) => {
  await context.route("https://mc.yandex.ru/**", route => route.abort());
});

test("a buyer can cook the right shrimp variant and return to its current price", async ({ page }) => {
  await page.goto("catalog/?q=патагонская&category=seafood&audit=recipes");
  const products = page.locator(".catalog-product:visible");
  await expect(products).toHaveCount(2);
  const peeled = products.filter({ hasText: "Глубоководная, очищенная" });
  await expect(peeled.getByRole("link", { name: "Патагонские креветки с чесноком", exact: true })).toBeVisible();
  await expect(products.filter({ hasNotText: "Глубоководная, очищенная" }).locator('a[href="../journal/464/"]')).toHaveCount(0);
  await peeled.getByRole("link", { name: "Патагонские креветки с чесноком", exact: true }).click();
  await expect(page).toHaveURL(/journal\/464\/$/);
  await expect(page.locator(".ship-log-entry__body")).toContainText("Можно размораживать в прохладной воде");
  await expect(page.locator(".recipe-archive-note")).toContainText("к дате публикации");
  expect(await page.getByRole("link", { name: "Читать запись в Телеграме", exact: true }).getAttribute("href")).toBe("https://t.me/kapitanseledkin/464");
  await page.locator(".recipe-current").getByRole("link", { name: "Креветка патагонская", exact: true }).click();
  await expect(page.locator(".catalog-product:visible")).toHaveCount(1);
  await expect(page.locator(".catalog-product:visible")).toContainText("Глубоководная, очищенная");
  await expect(page.locator(".catalog-product:visible strong")).toHaveText("2 990 ₽/кг");
});

test("desktop category photographs respond to pointer and keyboard while a touch opens the catalog directly", async ({ page, browser, baseURL }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("?audit=recipes#assortment");
  const photos = page.locator(".assortment-overview__photos");
  const original = await photos.boundingBox();
  await page.locator('.assortment-directory__link[href$="category-seafood"]').hover();
  await expect(photos.locator('[data-assortment-photo="seafood"]')).toBeVisible();
  await page.locator('.assortment-directory__link[href$="category-fillet"]').focus();
  await expect(photos.locator('[data-assortment-photo="fillet"]')).toBeVisible();
  const frame = await photos.boundingBox();
  expect(frame.height).toBeCloseTo(original.height, 0);
  await expect(photos.locator('[data-assortment-photo="fillet"] img')).toHaveJSProperty("complete", true);
  expect(await photos.locator('[data-assortment-photo="fillet"] img').evaluate(img => img.naturalWidth)).toBeGreaterThan(32);
  await page.locator('.assortment-directory__link[href$="category-fillet"]').press("Enter");
  await expect(page).toHaveURL(/catalog\/#category-fillet$/);
  const touch = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await touch.route("https://mc.yandex.ru/**", route => route.abort());
  const phone = await touch.newPage();
  await phone.goto(`${baseURL}?audit=recipes#assortment`);
  await phone.locator('.assortment-directory__link[href$="category-seafood"]').tap();
  await expect(phone).toHaveURL(/catalog\/#category-seafood$/);
  await expect(phone.locator("[data-catalog-count]")).toHaveText("20 позиций");
  await touch.close();
});

test("the recipe directory remains readable in both watches, narrow reflow and enlarged text", async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(90000);
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    await context.route("https://mc.yandex.ru/**", route => route.abort());
    await context.addInitScript(value => localStorage.setItem("seledkin-theme", value), theme);
    const page = await context.newPage();
    await page.goto(`${baseURL}recipes/?audit=recipes`);
    await expect(page.locator(".recipe-editorial-opening article")).toHaveCount(3);
    await expect(page.locator("#recipes .recipe-card")).toHaveCount(13);
    await expect(page.locator("#advice .recipe-card")).toHaveCount(4);
    await expect(page.locator("#meals .meal-collection")).toHaveCount(3);
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    expect(await page.evaluate(async () => (await axe.run({ runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })))).toEqual([]);
    for (const width of [1920, 1512, 1440, 1024, 980, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => document.fonts.ready);
      // WebKit updates the balanced text layout on the next rendered frames.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      const brokenWords = await page.locator(".meal-collection > header h3").evaluateAll(headings => headings.flatMap(heading => {
        const text = heading.firstChild;
        return [...text.textContent.matchAll(/[А-Яа-яЁё]+/g)].flatMap(match => {
          const lines = new Set([...match[0]].map((_, offset) => {
            const range = document.createRange();
            range.setStart(text, match.index + offset);
            range.setEnd(text, match.index + offset + 1);
            // Chromium includes the preceding soft-hyphen glyph in a range.
            return Math.round([...range.getClientRects()].at(-1).top);
          }));
          return lines.size > 1 ? [match[0]] : [];
        });
      }));
      expect(brokenWords, `Collection headings split words at ${width}px`).toEqual([]);
      for (const image of await page.locator(".recipe-editorial-opening img").all()) {
        expect(await image.evaluate(img => Math.abs(img.getBoundingClientRect().width / img.getBoundingClientRect().height - Number(img.getAttribute("width")) / Number(img.getAttribute("height"))))).toBeLessThan(0.02);
      }
      if ([1440, 390, 320].includes(width)) await page.screenshot({ path: testInfo.outputPath(`${theme}-${width}.png`) });
    }
    await page.addStyleTag({ content: "html { font-size:200% !important; }" });
    await page.getByRole("navigation", { name: "На этой странице" }).getByRole("link", { name: "Что купить к ужину" }).click();
    await expect(page.locator("#meals h2")).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`${theme}-320-text200.png`) });
    await context.close();
  }
});
