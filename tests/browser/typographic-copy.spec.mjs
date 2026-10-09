import { test, expect } from "@playwright/test";

const pages = JSON.parse(process.env.TYPOGRAPHY_PAGES || "[]");

test("changed typographic copy preserves narrow reflow and enlarged text @typography", async ({ browser, baseURL }) => {
  test.skip(!pages.length, "Only used for a verified typographic-only release");
  test.setTimeout(90000);
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    await context.route("https://mc.yandex.ru/**", route => route.abort());
    await context.addInitScript(value => localStorage.setItem("seledkin-theme", value), theme);
    const page = await context.newPage();
    for (const path of pages) {
      await page.goto(`${baseURL}${path}?audit=typography`);
      await expect(page.locator("main")).toBeVisible();
      for (const width of [1512, 1024, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      }
      await page.addStyleTag({ content: "html { font-size:200% !important; }" });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
    await context.close();
  }
});
