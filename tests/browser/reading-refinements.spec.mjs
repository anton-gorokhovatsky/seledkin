import { test, expect } from "@playwright/test";

test("recipe counts retain correct nouns after filtering and without JavaScript @recipes", async ({ page, browser, baseURL }) => {
  await page.goto("recipes/");
  const status = page.locator("[data-recipe-filter-status]");
  await expect(status).toHaveText("18 рецептов и 7 советов");
  await page.getByRole("button", { name: "Рыба 14", exact: true }).click();
  await expect(status).toHaveText("14 материалов");
  await page.getByRole("button", { name: "Все материалы 25", exact: true }).click();
  await expect(status).toHaveText("18 рецептов и 7 советов");
  const context = await browser.newContext({ javaScriptEnabled: false });
  const plain = await context.newPage();
  await plain.goto(new URL("recipes/", baseURL).href);
  expect(await plain.locator("[data-recipe-filter-status]").textContent()).toContain("7\u00a0советов");
  await context.close();
});
