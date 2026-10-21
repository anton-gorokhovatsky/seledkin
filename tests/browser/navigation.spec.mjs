import { catalogSize } from "../helpers/catalog.mjs";
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const routes = [
  ["Продукты и цены", "catalog/", "main h1"],
  ["Доставка", "#delivery", "#delivery h2"],
  ["Контакты", "#contacts", "#contacts h2"],
  ["Рецепты и советы", "recipes/", "main h1"],
  ["Судовой журнал", "journal/", "main h1"],
  ["О нас", "about/", "main h1"],
];

test("mobile inner pages have a direct, keyboard-accessible home link beside the menu @navigation", async ({ page, baseURL }, testInfo) => {
  for (const [width, path, enlarged] of [[390, "catalog/"], [390, "journal/702/"], [320, "recipes/"], [320, "about/"], [320, "recipes/", true]]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(path);
    if (enlarged) await page.addStyleTag({ content: "html { font-size:200% !important; } * { line-height:1.5 !important; letter-spacing:.12em !important; word-spacing:.16em !important; } p { margin-bottom:2em !important; }" });
    await page.evaluate(() => document.fonts.ready);
    // WebKit balances the enlarged headings on the next rendered frames.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const home = page.locator(".source-header").getByRole("link", { name: /на главную/ });
    await expect(home).toBeInViewport({ ratio: 1 });
    const bounds = await home.boundingBox();
    const menu = await page.getByRole("button", { name: "Открыть меню", exact: true }).boundingBox();
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    expect(bounds.x + bounds.width).toBeLessThan(menu.x);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow, `${width}px ${path}, enlarged: ${Boolean(enlarged)}`).toBeLessThanOrEqual(1);
    if (enlarged) {
      await page.locator('#recipe-title-382').scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath("recipe-enlarged-spacing.png") });
    }
    await home.focus();
    await expect(home).toBeFocused();
    if (path === "catalog/") await page.screenshot({ path: testInfo.outputPath("mobile-inner-header.png") });
    await home.press("Enter");
    await expect(page).toHaveURL(baseURL);
    await expect(page.locator("[data-menu]")).toBeHidden();
  }
});

test("a missing nested URL retains the catalog route and images without JavaScript on the custom domain", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  await context.route("https://mc.yandex.ru/**", route => route.abort());
  const page = await context.newPage();
  const missing = new URL("missing/old-tilda-page/", baseURL).href;
  const body = await readFile(new URL("../../404.html", import.meta.url), "utf8");
  await page.route(missing, route => route.fulfill({ status: 404, contentType: "text/html", body }));
  await page.goto(missing);
  await expect(page.locator("h1")).toHaveText("Такой страницы в лавке нет");
  await expect(page.locator(".not-found-source__brand img")).toHaveJSProperty("naturalWidth", 3600);
  const catalog = page.getByRole("link", { name: "Открыть каталог", exact: true });
  expect(await catalog.evaluate(link => link.href)).toBe(new URL("catalog/", baseURL).href);
  await catalog.click();
  await expect(page.locator(".catalog-product")).toHaveCount(catalogSize);
  await context.close();
});

for (const source of ["", "catalog/", "about/", "journal/"]) {
  test(`all menu destinations work from ${source || "home"} on desktop and mobile @navigation`, async ({ page, baseURL }) => {
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
  await expect(stories.locator("h2")).toHaveText("Рецепты и советы Олега");
  await expect(page.locator('#assortment #prices .catalog-product')).toHaveCount(6);
  await expect(page.locator('#assortment > .source-shell > h2, #assortment h2')).toHaveCount(1);
  await expect(page.locator('#prices h3')).toHaveText('Цены в лавке');
  await expect(stories.locator(".recipe-feature")).toHaveCount(1);
  await expect(stories.locator("#recipe-feature-title")).toHaveText("Рулетики с печенью трески");
  await expect(stories.locator(".recipe-feature time")).toHaveAttribute("datetime", "2026-10-13");
  await expect(stories.locator(".recipe-feature__photo")).toHaveAttribute("href", "recipes/701/");
  await expect(stories.locator(".watch-catch__item")).toHaveCount(3);
  expect(await stories.locator(".watch-catch__item > a").evaluateAll(links => links.map(link => link.getAttribute("href")))).toEqual(["recipes/692/", "recipes/664/", "recipes/627/"]);
  for (const width of [1440, 638, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const cards = stories.locator(".watch-catch__item");
    for (const card of await cards.all()) {
      const photo = card.locator("img");
      await photo.scrollIntoViewIfNeeded();
      const frame = await photo.evaluate(async image => {
        await image.decode();
        const box = image.getBoundingClientRect();
        return { ratio: box.width / box.height, source: image.naturalWidth / image.naturalHeight };
      });
      expect(Math.abs(frame.ratio - frame.source)).toBeLessThan(.01);
    }
    if (width > 979) {
      const lines = await cards.locator(".watch-catch__name").evaluateAll(names => names.map(name => name.getBoundingClientRect().top));
      expect(Math.max(...lines) - Math.min(...lines)).toBeLessThan(1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  await stories.getByRole("link", { name: "Печень трески по-мурмански в каталоге", exact: true }).click();
  await expect(page).toHaveURL(/product=cod-liver-murmansk-230#product-cod-liver-murmansk-230$/);
  await expect(page.locator("#product-cod-liver-murmansk-230").getByRole("heading", { name: "Печень трески по-мурмански", exact: true })).toBeInViewport();
  await expect(page.locator("[data-catalog-empty]")).toBeHidden();
  for (const source of ["about/#watch-catch", "about/index.html#watch-catch"]) {
    await page.goto(source);
    await expect(page).toHaveURL(/\/#watch-catch$/);
    await expect(page.locator("#watch-catch h2")).toBeInViewport();
  }
});

test("journal actions follow all text fragments with a readable gap", async ({ page }) => {
  for (const width of [390, 1024, 1440, 1624]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("journal/682/");
    await page.evaluate(() => document.fonts.ready);
    const gaps = await page.locator(".ship-log-entry").evaluateAll(entries => entries.map(entry => {
      const body = entry.querySelector(".ship-log-entry__body");
      const range = document.createRange();
      range.selectNodeContents(body);
      const textBottom = Math.max(...[...range.getClientRects()].map(rect => rect.bottom));
      const actions = entry.querySelector(".ship-log-entry__actions").getBoundingClientRect();
      return { id: entry.id, gap: actions.top - textBottom };
    }));
    expect(gaps).toHaveLength(1);
    for (const { id, gap } of gaps) expect(gap, `${width}px ${id}`).toBeGreaterThanOrEqual(23);
  }
});
