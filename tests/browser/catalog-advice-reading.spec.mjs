import { test, expect } from "@playwright/test";

test("a buyer reads the full roe guide on site and advice space follows its content @catalog @recipes", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("catalog/?category=caviar&audit=advice-reading");
  const longNote = page.locator("#product-caviar-007 .catalog-product-advice");
  const shortNote = page.locator("#product-caviar-009 .catalog-product-advice");
  const note = locator => locator.evaluate(element => {
    const style = getComputedStyle(element);
    return { height: element.clientHeight, border: parseFloat(style.borderInlineStartWidth), background: style.backgroundColor };
  });
  const long = await note(longNote), short = await note(shortNote);
  expect(long.height).toBeGreaterThan(short.height);
  expect(short.height).toBeLessThan(80);
  expect(short.border).toEqual(long.border);
  expect(short.background).toBe("rgba(0, 0, 0, 0)");
  // An old interview preference must not read as an endorsement of this lot.
  await expect(page.locator('#product-trout-roe .catalog-product-advice')).not.toContainText("Мне больше всего нравится");
  await page.setViewportSize({ width: 320, height: 1000 });
  const guide = page.locator('#product-caviar-005 .catalog-product-advice').getByRole("link", { name: "Как выбирать красную икру" });
  expect((await guide.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await guide.press("Enter");
  await expect(page.locator("h1")).toHaveText("Как выбирать красную икру");
  await expect(page.locator('.ship-log-entry__meta time')).toHaveAttribute("datetime", "2025-12-17");
  await expect(page.locator('.source-caption')).toHaveText("Красная икра — фотография из архива лавки");
  await expect(page.getByRole("link", { name: "Из телеграм-канала", exact: true })).toHaveAttribute("href", "https://t.me/kapitanseledkin/619");
  await expect(page.locator('.recipe-current a')).toHaveCount(4);
  await page.locator('.journal-story > img').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("roe-guide-320.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
