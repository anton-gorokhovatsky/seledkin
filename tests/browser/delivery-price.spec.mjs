import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("delivery price fits with enlarged text and user spacing @delivery", async ({ page }, testInfo) => {
  await page.route("**/qa-reflow-serif.ttf", async route => route.fulfill({
    contentType: "font/ttf",
    body: await readFile(new URL("../fixtures/fonts/DejaVuSerif.ttf", import.meta.url)),
  }));
  await page.goto("?audit=delivery-price#delivery");
  const price = page.locator(".delivery-waybill__price");
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const mode of ["normal", "enlarged", "wide-serif"]) {
      const enlarged = mode !== "normal";
      const spacing = enlarged ? await page.addStyleTag({ content: `
        html { font-size: 200% !important; }
        * { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; }
        p { margin-bottom: 2em !important; }
        ${mode === "wide-serif" ? '@font-face { font-family: "QA Reflow Serif"; src: url("/qa-reflow-serif.ttf"); } .delivery-waybill__price { font-family: "QA Reflow Serif", serif; }' : ""}
      ` }) : null;
      await page.evaluate(() => document.fonts.ready);
      const bounds = await price.evaluate(node => {
        const range = document.createRange();
        range.selectNodeContents(node);
        const box = node.getBoundingClientRect();
        return {
          width: innerWidth,
          overflow: document.documentElement.scrollWidth - innerWidth,
          fontSize: getComputedStyle(node).fontSize,
          left: box.left, right: box.right,
          text: [...range.getClientRects()].map(rect => ({ left: rect.left, right: rect.right })),
        };
      });
      await expect(price).toHaveText("490 ₽");
      expect(bounds.overflow, JSON.stringify(bounds)).toBeLessThanOrEqual(1);
      for (const line of bounds.text) {
        expect(line.left).toBeGreaterThanOrEqual(bounds.left - 1);
        expect(line.right, JSON.stringify({ mode, ...bounds })).toBeLessThanOrEqual(bounds.right + 1);
      }
      if (!enlarged && width !== 320) {
        await price.scrollIntoViewIfNeeded();
        await page.screenshot({ path: testInfo.outputPath(`delivery-price-${width}.png`) });
      }
      if (width === 320 && enlarged) {
        for (const theme of ["light", "dark"]) {
          await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
          await price.scrollIntoViewIfNeeded();
          await page.screenshot({ path: testInfo.outputPath(`delivery-price-320-${theme}-${mode}.png`) });
        }
      }
      if (spacing) await spacing.evaluate(node => node.remove());
    }
  }
});
