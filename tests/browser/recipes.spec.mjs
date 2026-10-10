import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

test.beforeEach(async ({ context }) => {
  await context.route("https://mc.yandex.ru/**", route => route.abort());
});

test("catalog advice previews retain the full photograph, keyboard access and direct touch navigation @catalog", async ({ page, browser, baseURL }, testInfo) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("seledkin-theme")) localStorage.setItem("seledkin-theme", "light");
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("catalog/?q=мясо+мидий&category=seafood&audit=advice");
  await page.evaluate(() => document.fonts.ready);
  const product = page.locator(".catalog-product:visible");
  const recipe = product.getByRole("link", { name: "Мидии с рисом", exact: true });
  const photo = recipe.locator(".catalog-advice-photo");
  await recipe.hover();
  await expect(photo).toBeVisible();
  await expect(photo.locator("img")).toHaveJSProperty("complete", true);
  const frame = await photo.locator("img").evaluate(img => ({ natural: img.naturalWidth / img.naturalHeight, rendered: img.clientWidth / img.clientHeight }));
  expect(Math.abs(frame.natural - frame.rendered)).toBeLessThan(.02);
  const bounds = await photo.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(12);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(1440 - 12);
  expect(bounds.y).toBeGreaterThanOrEqual(12);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(1000 - 12);
  await page.screenshot({ path: testInfo.outputPath("advice-hover-1440-light.png") });
  await page.evaluate(() => localStorage.setItem("seledkin-theme", "dark"));
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  await recipe.hover();
  await expect(photo).toBeVisible();
  await expect(photo.locator("img")).toHaveJSProperty("complete", true);
  await page.screenshot({ path: testInfo.outputPath("advice-hover-1440-dark.png") });
  await photo.hover();
  await expect(photo).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(photo).toBeHidden();
  await page.mouse.move(0, 0);
  // Start from the last purchase control, directly before the editorial links.
  await product.locator("summary").focus();
  // Safari on macOS includes links with Option–Tab unless full keyboard
  // navigation is enabled; preserve the browser's native preference.
  await page.keyboard.press(testInfo.project.name === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab");
  await expect(recipe).toBeFocused();
  await expect(photo).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(photo).toBeHidden();
  await expect(recipe).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/journal\/574\/$/);

  await page.goto("catalog/?q=кальмар&category=seafood&audit=advice");
  await page.locator('.catalog-advice-link[href="https://t.me/kapitanseledkin/610"]').first().hover();
  await expect(page.locator(".catalog-advice-link.is-previewing img")).toHaveAttribute("src", /journal-610-/);
  const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const phone = await phoneContext.newPage();
  await phone.goto(`${baseURL}catalog/?q=мясо+мидий&category=seafood&audit=advice`);
  await phone.locator(".catalog-product:visible").getByRole("link", { name: "Мидии с рисом", exact: true }).tap();
  await expect(phone).toHaveURL(/journal\/574\/$/);
  await phoneContext.close();
});

test("a buyer can cook the right shrimp variant and return to its current price @journal", async ({ page }) => {
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
  await expect(page.getByRole("complementary", { name: "Условия из публикации" })).toContainText("Заказы принимаются только в WhatsApp");
  await expect(page.locator(".journal-historical__current")).toContainText("Сейчас заказ можно оформить");
  await expect(page.locator(".journal-historical__current").getByRole("link", { name: "Телеграме" })).toHaveAttribute("href", /^https:\/\/t.me\/\+79166751452\?text=/);
  expect(await page.getByRole("link", { name: "Читать запись в Телеграме", exact: true }).getAttribute("href")).toBe("https://t.me/kapitanseledkin/464");
  await page.locator(".recipe-current").getByRole("link", { name: "Креветка патагонская", exact: true }).click();
  await expect(page.locator(".catalog-product:visible")).toHaveCount(1);
  await expect(page.locator(".catalog-product:visible")).toContainText("Глубоководная, очищенная");
  await expect(page.locator(".catalog-product:visible strong")).toHaveText("2 990 ₽/кг");
});

test("desktop category photographs respond to pointer and keyboard while a touch opens the catalog directly", async ({ page, browser, baseURL }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("?audit=recipes#assortment");
  // Keep the pointer on the intended link after the web fonts settle.
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const photos = page.locator(".assortment-overview__photos");
  const original = await photos.boundingBox();
  await page.locator('.assortment-directory__link[href$="category-seafood"]').hover();
  await expect(photos.locator('[data-assortment-photo="seafood"]')).toBeVisible();
  // Focusing scrolls the page: a parked pointer must not hover another category.
  await page.mouse.move(0, 0);
  await page.locator('.assortment-directory__link[href$="category-fillet"]').focus();
  await expect(page.locator('.assortment-directory__link[href$="category-fillet"]')).toBeFocused();
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

test("ingredients retain the editorial spreads, browser history and an exact catalog product", async ({ page }) => {
  await page.goto("recipes/?audit=ingredients");
  await expect(page.locator("[data-recipe-opening]")).toBeVisible();
  await expect(page.locator(".recipe-record:visible")).toHaveCount(17);
  const mussels = page.getByRole("button", { name: /^Мидии/ });
  await mussels.press("Enter");
  await expect(mussels).toBeFocused();
  await expect(mussels).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-recipe-opening]")).toBeHidden();
  await expect(page.locator(".recipe-record:visible")).toHaveCount(2);
  await expect(page.locator("[data-recipe-filter-status]")).toHaveText("2 материала");
  await page.reload();
  await expect(page.locator(".recipe-record:visible")).toHaveCount(2);
  await page.getByRole("button", { name: /^Все материалы/ }).press("Enter");
  await expect(page.locator("[data-recipe-opening]")).toBeVisible();
  await page.goBack();
  await expect(mussels).toHaveAttribute("aria-pressed", "true");
  await page.locator('[data-recipe-material="574"] .recipe-record-product').click();
  await expect(page.locator(".catalog-product:visible")).toHaveCount(1);
  await expect(page.locator(".catalog-product:visible h4")).toHaveText("Мясо мидий");
  await page.goBack();
  await expect(page.locator(".recipe-record:visible")).toHaveCount(2);
});

test("the recipe directory remains readable in both watches, narrow reflow and enlarged text @typography", async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(90000);
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    await context.route("https://mc.yandex.ru/**", route => route.abort());
    await context.addInitScript(value => localStorage.setItem("seledkin-theme", value), theme);
    const page = await context.newPage();
    await page.goto(`${baseURL}recipes/?audit=recipes`);
    await expect(page.locator(".recipe-editorial-opening article")).toHaveCount(3);
    await expect(page.locator('.recipe-record[data-kind="recipe"]:visible')).toHaveCount(13);
    await expect(page.locator('.recipe-record[data-kind="advice"]:visible')).toHaveCount(4);
    await expect(page.locator("#meals .meal-collection")).toHaveCount(3);
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    expect(await page.evaluate(async () => (await axe.run({ runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })))).toEqual([]);
    for (const width of [1920, 1512, 1440, 1024, 980, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => document.fonts.ready);
      // WebKit updates the balanced text layout on the next rendered frames.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      const brokenWords = await page.locator("#meal-seafood-dinner").evaluate(heading => {
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
      });
      expect(brokenWords, `Seafood dinner heading splits word fragments at ${width}px`).toEqual([]);
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
