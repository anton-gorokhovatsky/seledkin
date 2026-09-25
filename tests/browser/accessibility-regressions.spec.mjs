import { test, expect } from "@playwright/test";

test("each modal owns initial focus, every Tab stop and its close action", async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["", "catalog/", "about/", "journal/"]) {
      await page.goto(route);
      const opener = page.getByRole("button", { name: "Открыть меню", exact: true });
      await opener.focus();
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog");
      const close = dialog.getByRole("button", { name: "Закрыть меню", exact: true });
      await expect(close).toBeFocused();
      await expect(opener).toBeHidden();
      await expect(page.locator("main")).toHaveJSProperty("inert", true);
      const count = await dialog.locator("a[href]:visible, button:visible:not([disabled])").count();
      await page.keyboard.press("Shift+Tab");
      await expect(dialog.locator("[data-theme-toggle]")).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(close).toBeFocused();
      for (let i = 0; i < count + 2; i++) {
        await page.keyboard.press("Tab");
        expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
      }
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(opener).toBeFocused();
      await expect(page.locator("main")).toHaveJSProperty("inert", false);
      await opener.click();
      await close.click();
      await expect(opener).toBeFocused();
    }
  }
});

for (const mode of ["no-js", "failed-module"]) {
  test(`navigation remains usable with ${mode}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: mode !== "no-js", reducedMotion: "reduce" });
    await context.route("https://mc.yandex.ru/**", route => route.abort());
    if (mode === "failed-module") await context.route("**/assets/site.js*", route => route.abort());
    const page = await context.newPage();
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ["", "catalog/", "about/", "journal/"]) {
        await page.goto(new URL(route, baseURL).href);
        await expect(page.locator("[data-menu-toggle]")).toBeHidden();
        const menuLink = page.getByRole("link", { name: "Перейти к меню сайта" });
        await menuLink.click();
        const navigation = page.getByRole("navigation", { name: "Разделы сайта", exact: true });
        await expect(navigation).toBeInViewport();
        await expect(navigation.getByRole("link")).toHaveCount(6);
        await navigation.getByRole("link", { name: "Продукты и цены" }).click();
        await expect(page).toHaveURL(new URL("catalog/", baseURL).href);
        await expect(page.locator(".catalog-product")).toHaveCount(114);
        await page.waitForLoadState("load");
        await page.evaluate(() => document.fonts.ready);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
    }
    await context.close();
  });
}

test("the complete selected category stays legible at 320px with enlarged text and spacing", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  for (const mode of ["normal", "text", "spacing", "forced"]) {
    await page.emulateMedia({ forcedColors: mode === "forced" ? "active" : "none" });
    await page.goto("catalog/?category=prepared-fish");
    if (mode === "text") await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    if (mode === "spacing") await page.addStyleTag({ content: "* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; }" });
    await page.evaluate(() => document.fonts.ready);
    const select = page.getByRole("combobox", { name: "Категория", exact: true });
    const label = page.locator("[data-catalog-selected-label]");
    for (const [value, name] of [["prepared-fish", "Слабосоленая и копченая рыба"], ["frozen-fish", "Свежемороженая рыба"], ["all", "Весь ассортимент"]]) {
      await select.selectOption(value);
      await expect(label).toHaveText(name);
      await expect(label).toBeVisible();
      const geometry = await label.evaluate(el => {
        const box = el.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(el);
        const fragments = [...range.getClientRects()];
        return {
          // All rendered text fragments must fit; an unclipped outer box is insufficient.
          fits: fragments.every(r => r.left >= box.left && r.right <= box.right && r.top >= box.top && r.bottom <= box.bottom),
          wraps: fragments.length > 1,
          noOverflow: document.documentElement.scrollWidth <= innerWidth,
        };
      });
      expect(geometry.fits, `${mode}: ${name}`).toBe(true);
      expect(geometry.noOverflow).toBe(true);
      if (mode === "text" && value !== "all") expect(geometry.wraps).toBe(true);
      await select.focus();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Shift+Tab");
      await expect(select).toBeFocused();
      expect(await label.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe("none");
    }
    await select.selectOption("prepared-fish");
    await select.selectOption("frozen-fish");
    await page.goBack();
    await expect(label).toHaveText("Слабосоленая и копченая рыба");
    await page.locator("[data-catalog-reset]").click();
    await expect(label).toHaveText("Весь ассортимент");
  }
});
