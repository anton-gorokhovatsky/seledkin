import { test, expect } from "@playwright/test";

test("catalog prices remain unobscured when they pass the menu position @catalog", async ({ page }) => {
  for (const width of [1512, 960, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("catalog/?category=caviar");
    const price = page.locator("#product-caviar-002 strong");
    await page.evaluate(() => document.fonts.ready);
    // Reproduce the reported reading position, with the price near the top edge.
    await price.evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + scrollY - 50));
    await expect(price).toBeInViewport();
    const obscured = await price.evaluate(element => {
      const price = element.getBoundingClientRect();
      const menu = document.querySelector("[data-menu-toggle]").getBoundingClientRect();
      return price.left < menu.right && price.right > menu.left
        && price.top < menu.bottom && price.bottom > menu.top;
    });
    expect(obscured, `${width}px`).toBe(false);
    await page.locator("[data-menu-toggle]").click();
    await expect(page.locator("[data-menu]")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-menu-toggle]")).toBeFocused();
    await expect(page.locator("[data-menu-toggle]")).toBeInViewport();
  }
});

test("recipe counts retain correct nouns after filtering and without JavaScript @recipes", async ({ page, browser, baseURL }) => {
  await page.goto("recipes/");
  const status = page.locator("[data-recipe-filter-status]");
  await expect(status).toHaveText("17 рецептов и 7 советов");
  await page.getByRole("button", { name: "Рыба 13", exact: true }).click();
  await expect(status).toHaveText("13 материалов");
  await page.getByRole("button", { name: "Все материалы 24", exact: true }).click();
  await expect(status).toHaveText("17 рецептов и 7 советов");
  const context = await browser.newContext({ javaScriptEnabled: false });
  const plain = await context.newPage();
  await plain.goto(new URL("recipes/", baseURL).href);
  expect(await plain.locator("[data-recipe-filter-status]").textContent()).toContain("7\u00a0советов");
  await context.close();
});
