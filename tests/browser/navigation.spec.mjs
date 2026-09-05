import { test, expect } from "@playwright/test";

const routes = [
  ["Что продаём", "#assortment", "#assortment h2"],
  ["Продукты и цены", "catalog/", "main h1"],
  ["Доставка", "#delivery", "#delivery h2"],
  ["Контакты", "#contacts", "#contacts h2"],
  ["О нас", "about/", "main h1"],
  ["Судовой журнал", "journal/", "main h1"],
];

for (const source of ["", "catalog/", "about/", "journal/"]) {
  test(`all menu destinations work from ${source || "home"} on desktop and mobile`, async ({ page, baseURL }) => {
    test.setTimeout(90000);
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [label, destination, heading] of routes) {
        await page.goto(source, { waitUntil: "domcontentloaded" });
        await page.locator("[data-menu-toggle]").click();
        const menu = page.getByRole("navigation", { name: "Меню сайта", exact: true });
        const current = menu.locator('[aria-current="page"]');
        if (source) await expect(current.locator("span").last()).toHaveText(routes.find(([, path]) => path === source)[0]);
        else await expect(current).toHaveCount(0);
        await menu.getByRole("link", { name: label, exact: true }).click();
        await expect(page).toHaveURL(new URL(destination, baseURL).href);
        await expect(page.locator("[data-menu]")).toBeHidden();
        await expect(page.locator("main")).not.toHaveAttribute("inert", "");
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator(heading)).toBeInViewport();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
    }
  });
}

test("recipes are on the homepage and each featured product opens matching catalog results", async ({ page }) => {
  await page.goto("#watch-catch");
  const stories = page.locator("#watch-catch");
  await expect(stories.locator("h2")).toHaveText("Свежий улов");
  await expect(stories.locator(".watch-catch__item")).toHaveCount(4);
  const links = await stories.getByRole("link", { name: "Открыть в каталоге", exact: true }).evaluateAll(items => items.map(item => item.href));
  for (const [index, name] of ["Сельдь слабосоленая", "Креветка северная в/м", "Кальмар командорский", "Осьминог"].entries()) {
    await page.goto(links[index]);
    await expect(page.locator(".catalog-product:visible").getByRole("heading", { name, exact: true })).toBeVisible();
    await expect(page.locator("[data-catalog-empty]")).toBeHidden();
  }
  for (const source of ["about/#watch-catch", "about/index.html#watch-catch"]) {
    await page.goto(source);
    await expect(page).toHaveURL(/\/#watch-catch$/);
    await expect(page.locator("#watch-catch h2")).toBeInViewport();
  }
});

test("journal actions follow all text fragments with a readable gap", async ({ page }) => {
  for (const width of [390, 1024, 1440, 1624]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("journal/");
    await page.evaluate(() => document.fonts.ready);
    const gaps = await page.locator(".ship-log-entry").evaluateAll(entries => entries.map(entry => {
      const body = entry.querySelector(".ship-log-entry__body");
      const range = document.createRange();
      range.selectNodeContents(body);
      const textBottom = Math.max(...[...range.getClientRects()].map(rect => rect.bottom));
      const actions = entry.querySelector(".ship-log-entry__actions").getBoundingClientRect();
      return { id: entry.id, gap: actions.top - textBottom };
    }));
    for (const { id, gap } of gaps) expect(gap, `${width}px ${id}`).toBeGreaterThanOrEqual(23);
  }
});
