import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
}

test("prices and product-specific order links survive unavailable JavaScript", async ({ browser, baseURL }) => {
  for (const mode of ["disabled", "failed-module"]) {
    const context = await browser.newContext({ javaScriptEnabled: mode !== "disabled", viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    if (mode === "failed-module") await page.route("**/catalog/catalog.js*", (route) => route.abort());
    await page.goto(`${baseURL}catalog/`);
    await expect(page.locator(".catalog-product")).toHaveCount(114);
    await expect(page.locator("[data-catalog-controls]")).toBeHidden();
    await expect(page.locator("[data-catalog-count]")).toHaveText("114 позиций");
    const product = page.locator(".catalog-product").first();
    await product.locator("summary").click();
    await expect(product.getByRole("link")).toHaveCount(2);
    for (const link of await product.getByRole("link").all()) {
      const url = new URL(await link.getAttribute("href"));
      expect(url.searchParams.get("text")).toContain("Хочу заказать");
      expect(url.searchParams.get("text")).toContain("икра");
      expect(url.searchParams.get("text")).toContain("0,05");
    }
    await noOverflow(page);
    await context.close();
  }
});

test("search, category, shared URL and browser history retain the same selection", async ({ page, context }) => {
  await page.goto("catalog/");
  const search = page.locator("[data-catalog-search]");
  const count = page.locator("[data-catalog-count]");
  await search.fill("нерка");
  await expect(count).toHaveText("2 позиции");
  expect(new URL(page.url()).searchParams.get("q")).toBe("нерка");
  await page.reload();
  await expect(search).toHaveValue("нерка");
  await expect(count).toHaveText("2 позиции");
  const shared = await context.newPage();
  await shared.goto(page.url());
  await expect(shared.locator("[data-catalog-count]")).toHaveText("2 позиции");
  await shared.close();
  await page.locator("[data-catalog-select]").selectOption("seafood");
  await expect(count).toHaveText("Ничего не найдено");
  await page.goBack();
  await expect(count).toHaveText("2 позиции");
  await expect(page.locator("[data-catalog-select]")).toHaveValue("all");
  await page.goForward();
  await expect(count).toHaveText("Ничего не найдено");
  await page.locator("[data-catalog-reset]").click();
  await expect(count).toHaveText("114 позиций");
  await search.fill("морепродукты");
  await expect(count).toHaveText("20 позиций");
  await search.fill("НЕСУЩЕСТВУЮЩИЙ ТОВАР");
  await expect(page.locator("[data-catalog-empty]")).toBeVisible();
  await page.locator("[data-catalog-reset]").click();
  await expect(search).toBeFocused();
  await page.goto("catalog/#category-seafood");
  await expect(count).toHaveText("20 позиций");
  const summary = page.locator(".catalog-product:visible summary").first();
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(summary.locator("..").getByRole("link").first()).toBeVisible();
  await noOverflow(page);
});

test("contact anchor is clear of the menu; Escape only closes the top interaction", async ({ page, browserName }) => {
  await page.goto("");
  await page.evaluate(() => document.fonts.ready);
  const menu = page.locator("[data-menu-toggle]");
  await menu.click();
  await page.locator('.site-menu__routes a[href="#contacts"]').click();
  const heading = await page.locator("#contacts-title").boundingBox();
  const button = await menu.boundingBox();
  expect(heading.y).toBeGreaterThan(button.y + button.height);
  const map = page.locator("[data-map-toggle]");
  await map.click();
  await page.locator(".source-footer__details").scrollIntoViewIfNeeded();
  const scroll = await page.evaluate(() => scrollY);
  await menu.click();
  await expect(page.locator("main")).toHaveJSProperty("inert", true);
  if (browserName === "chromium") {
    await menu.focus();
    for (let i = 0; i < 14; i += 1) await page.keyboard.press("Tab");
    await expect(menu).toBeFocused();
  }
  await menu.focus();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(map).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("main")).toHaveJSProperty("inert", false);
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(scroll, 0);
  await page.keyboard.press("Escape");
  await expect(map).toBeFocused();
  await expect(map).toHaveAttribute("aria-pressed", "false");
});

test("hero is compact and journal controls remain one stable row in every state", async ({ page }, testInfo) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("");
    await page.evaluate(() => document.fonts.ready);
    const hero = await page.locator(".source-hero").boundingBox();
    if (width < 1000) {
      expect(hero.height).toBeLessThan(1100);
      await expect(page.locator(".source-button--hero-secondary")).toBeVisible();
    }
    const counter = page.locator("[data-hero-journal-counter]");
    const center = await counter.evaluate(e => { const r = e.getBoundingClientRect(); return r.x + r.width / 2; });
    for (let index = 1; index <= 5; index += 1) {
      await expect(counter).toHaveText(`${index} из 5`);
      // Read one layout frame: lazy media or scrolling must not mix coordinates.
      const { box, right, row } = await page.evaluate((last) => {
        const rect = (selector) => document.querySelector(selector).getBoundingClientRect().toJSON();
        return {
          box: rect("[data-hero-journal-counter]"),
          right: rect(last ? "[data-hero-journal-all]" : "[data-hero-journal-next]"),
          row: rect(".source-hero__journal-controls"),
        };
      }, index === 5);
      expect(box.x + box.width / 2).toBeCloseTo(center, 0);
      const next = page.locator(index === 5 ? "[data-hero-journal-all]" : "[data-hero-journal-next]");
      expect(right.x).toBeGreaterThanOrEqual(box.x + box.width + 4);
      // Existing hover lifts the control by 1.28px; it must still occupy one row.
      expect(Math.abs(right.y + right.height / 2 - row.y - row.height / 2)).toBeLessThanOrEqual(2);
      // Translated DOMRects can report 43.99997 for a 44px target on Linux.
      expect(Math.round(right.height * 1000) / 1000).toBeGreaterThanOrEqual(44);
      expect(right.x + right.width).toBeLessThanOrEqual(row.x + row.width + 1);
      if (index < 5) await next.click();
    }
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`hero-${width}.png`) });
  }
});

test("all pages and open navigation pass axe in both watches", async ({ browser, baseURL }, testInfo) => {
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    await context.addInitScript(value => localStorage.setItem("seledkin-theme", value), theme);
    const page = await context.newPage();
    for (const path of ["", "catalog/", "404.html"]) {
      await page.goto(`${baseURL}${path}`);
      await page.evaluate(() => document.fonts.ready);
      await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
      const audit = () => page.evaluate(async () => (await axe.run({ runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } })).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })));
      expect(await audit()).toEqual([]);
      await noOverflow(page);
      await page.screenshot({ path: testInfo.outputPath(`${theme}-${path.replace(/\W/g, "") || "home"}.png`) });
      if (path !== "404.html") {
        await page.locator("[data-menu-toggle]").click();
        expect(await audit()).toEqual([]);
        await page.keyboard.press("Escape");
      }
    }
    await context.close();
  }
});

test("320px reflow, enlarged text, custom spacing and contrast retain controls", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  for (const path of ["", "catalog/", "404.html"]) {
    for (const mode of ["text", "spacing", "contrast", "forced"]) {
      await page.emulateMedia({ reducedMotion: "reduce", contrast: mode === "contrast" ? "more" : "no-preference", forcedColors: mode === "forced" ? "active" : "none" });
      await page.goto(path);
      if (mode === "text") await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
      if (mode === "spacing") await page.addStyleTag({ content: "* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }" });
      await noOverflow(page);
      const clipped = await page.locator(".source-button:visible, summary:visible, input:visible, select:visible").evaluateAll(elements => elements.filter(e => { const r = e.getBoundingClientRect(); return r.x < -1 || r.right > innerWidth + 1; }).map(e => e.textContent.trim() || e.tagName));
      expect(clipped).toEqual([]);
    }
  }
});
