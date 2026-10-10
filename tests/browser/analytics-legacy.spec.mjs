import { test, expect } from "@playwright/test";
import { legacyRoutes } from "../../scripts/legacy-routes.mjs";

async function publicFixture(page, baseURL, ordinary = true) {
  if (ordinary) await page.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => false }));
  await page.route("https://ks.fish/**", async route => {
    const url = new URL(route.request().url());
    const response = await page.request.get(new URL(`${url.pathname}${url.search}`, baseURL).href);
    await route.fulfill({ response });
  });
  const requests = [];
  await page.route("https://mc.yandex.ru/**", route => {
    requests.push(route.request().url());
    return route.fulfill({ contentType: "application/javascript", body: "window.goalCalls=[]; window.ym=(...args)=>window.goalCalls.push(args);" });
  });
  return requests;
}

test("typing is not a failed search, and broadening records a successful recovery @analytics", async ({ page, baseURL }) => {
  await publicFixture(page, baseURL);
  await page.goto("https://ks.fish/catalog/?category=caviar");
  const search = page.getByRole("searchbox", { name: "Найти товар" });
  await search.fill("креветки");
  // The previous implementation sent both search and failure after 800 ms.
  await page.waitForTimeout(900);
  expect(await page.evaluate(() => window.goalCalls.filter(call => call[1] === "reachGoal"))).toEqual([]);
  await search.press("Enter");
  await expect.poll(() => page.evaluate(() => window.goalCalls.find(call => call[2] === "catalog_search_empty")?.[3].result)).toBe("other_category");
  await page.getByRole("button", { name: "Искать во всём каталоге" }).press("Enter");
  await expect(page.locator(".catalog-product:visible")).toHaveCount(5);
  const recovery = await page.evaluate(() => window.goalCalls.filter(call => call[2] === "catalog_search_recovered"));
  expect(recovery).toHaveLength(1);
  expect(recovery[0][3]).toMatchObject({ method: "category", previous_result: "other_category", products: 5, trigger: "broaden" });
  expect(JSON.stringify(recovery)).not.toContain("креветки");
  await search.fill("такойрыбынет");
  await search.press("Enter");
  await search.fill("");
  await search.fill("тунец");
  await search.press("Enter");
  expect(await page.evaluate(() => window.goalCalls.filter(call => call[2] === "catalog_search_recovered").length)).toBe(1);
});

test("afisha records the photographed product through catalog and order list @analytics", async ({ page, baseURL }) => {
  await publicFixture(page, baseURL);
  await page.goto("https://ks.fish/");
  await expect.poll(() => page.evaluate(() => Array.isArray(window.goalCalls))).toBe(true);
  await page.locator(".afisha__change").click();
  await expect.poll(() => page.evaluate(() => window.goalCalls.find(call => call[2] === "product_select")?.[3].action)).toBe("preview");
  expect(await page.evaluate(() => window.goalCalls.find(call => call[2] === "product_select")[3])).toMatchObject({context:"afisha",product:"Икра форели",method:"button",photo:2});
  await page.evaluate(() => document.addEventListener("click", event => { if (event.target.closest(".afisha__catalog")) event.preventDefault(); }));
  const href = await page.locator(".afisha__catalog").getAttribute("href");
  await page.locator(".afisha__catalog").click();
  expect(await page.evaluate(() => window.goalCalls.filter(call => call[2] === "product_select").at(-1)[3])).toMatchObject({context:"afisha",action:"open_catalog",product:"Икра форели",photo:2});
  await page.goto(new URL(href, page.url()).href);
  await page.locator(".catalog-product:visible summary").click();
  await expect.poll(() => page.evaluate(() => window.goalCalls.find(call => call[2] === "product_select")?.[3].source)).toBe("afisha");
  await page.locator(".catalog-product:visible").getByRole("checkbox").check();
  await page.getByRole("link", { name: "Список заказа · 1 позиция" }).click();
  await page.evaluate(() => document.addEventListener("click", event => { if (event.target.closest('#order-list a[href^="https://t.me"]')) event.preventDefault(); }));
  await page.locator("#order-list").getByRole("link", { name: "Отправить список в Телеграме" }).click();
  expect(await page.evaluate(() => window.goalCalls.find(call => call[2] === "order_click")[3])).toMatchObject({context:"order_list",channel:"telegram",source:"afisha",count:1});
  expect(JSON.stringify(await page.evaluate(() => window.goalCalls))).not.toContain("Хочу заказать");
});

test("service entry excludes the whole tab, but an explicit ordinary visit can resume measurement @analytics", async ({ page, baseURL }) => {
  const requests = await publicFixture(page, baseURL);
  await page.goto("https://ks.fish/?audit=analytics-check");
  await page.getByRole("link", { name: "Весь каталог", exact: true }).click();
  await expect(page.getByRole("searchbox", { name: "Найти товар" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Найти товар" }).fill("тунец");
  await page.getByRole("searchbox", { name: "Найти товар" }).press("Enter");
  expect(requests).toEqual([]);
  expect(await page.locator('script[src="https://mc.yandex.ru/metrika/tag.js"]').count()).toBe(0);
  await page.goto("https://ks.fish/catalog/?analytics=on");
  await expect.poll(() => requests.length).toBe(1);
});

test("automated public visits cannot start the vendor counter @analytics", async ({ page, baseURL }) => {
  const requests = await publicFixture(page, baseURL, false);
  await page.goto("https://ks.fish/catalog/");
  await page.getByRole("searchbox", { name: "Найти товар" }).fill("тунец");
  await page.getByRole("searchbox", { name: "Найти товар" }).press("Enter");
  expect(requests).toEqual([]);
  await expect(page.locator(".catalog-product:visible")).toHaveCount(1);
});

test("old categories reach current prices and preserve the search and service markers", async ({ page, baseURL }) => {
  for (const route of legacyRoutes) {
    await page.goto(`${route.path}/?audit=legacy-check`);
    const target = new URL(route.target, "http://127.0.0.1:4173/");
    await expect(page).toHaveURL(url => url.pathname === target.pathname && url.searchParams.get("category") === target.searchParams.get("category") && url.searchParams.get("audit") === "legacy-check");
    await expect(page.getByRole("searchbox", { name: "Найти товар" })).toBeVisible();
    if (target.searchParams.has("category")) await expect(page.locator("[data-catalog-select]")).toHaveValue(target.searchParams.get("category"));
  }
  await page.goto("svezhemorozhenaya-ryba?q=минтай&utm_source=old-link&audit=legacy-check&category=caviar");
  await expect(page).toHaveURL(url => url.pathname === "/catalog/" && url.searchParams.get("category") === "frozen-fish" && url.searchParams.get("utm_source") === "old-link" && url.searchParams.get("audit") === "legacy-check");
  await expect(page.getByRole("searchbox", { name: "Найти товар" })).toHaveValue("минтай");
  await expect(page.locator(".catalog-product:visible")).toHaveCount(1);
  await expect(page.locator(".catalog-product:visible")).toContainText("Минтай");
});

test("legacy routing also works without JavaScript and does not load an unconditional tracking pixel", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const requests = [];
  page.on("request", request => { if (request.url().includes("mc.yandex.ru")) requests.push(request.url()); });
  await page.goto("http://127.0.0.1:4173/collection/");
  await expect(page).toHaveURL("http://127.0.0.1:4173/catalog/");
  await expect(page.locator(".catalog-product")).toHaveCount(116);
  expect(requests).toEqual([]);
  await context.close();
});
