import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const journal = JSON.parse(readFileSync(new URL("../../content/journal.json", import.meta.url), "utf8"));

test("an empty category search can broaden without losing the query or browser history", async ({ page }, testInfo) => {
  await page.goto("catalog/");
  const search = page.getByRole("searchbox", { name: "Найти товар" });
  await search.fill("креветки вареные");
  await expect(page.locator(".catalog-product:visible")).toHaveCount(1);
  await page.locator("[data-catalog-select]").selectOption("caviar");
  await expect(page.locator("[data-catalog-empty-message]")).toHaveText("В категории «Икра» совпадений нет.");
  await expect(page.locator("[data-catalog-order-title]")).toHaveText("Помочь с выбором?");
  const broaden = page.getByRole("button", { name: "Искать во всём каталоге" });
  await broaden.press("Enter");
  await expect(search).toHaveValue("креветки вареные");
  await expect(search).toBeFocused();
  await expect(page.locator(".catalog-product:visible")).toHaveCount(1);
  await expect(page.locator(".catalog-product:visible")).toContainText("В/м — варёно-мороженый продукт");
  expect(new URL(page.url()).searchParams.get("category")).toBeNull();
  await expect(page.locator("[data-catalog-order-title]")).toHaveText("Нашли нужное?");
  await page.goBack();
  await expect(search).toHaveValue("креветки вареные");
  await expect(page.locator("[data-catalog-select]")).toHaveValue("caviar");
  await expect(broaden).toBeVisible();
  await page.locator("[data-catalog-reset]").click();
  await expect(search).toHaveValue("");
  await expect(page.locator(".catalog-product:visible")).toHaveCount(114);
  await search.fill("такойрыбынет");
  await expect(page.locator("[data-catalog-empty]")).toBeVisible();
  await expect(broaden).toBeHidden();
  // Journal matches do not conceal recovery from a selected product category.
  await search.fill("риет");
  await page.locator("[data-catalog-select]").selectOption("caviar");
  await expect(broaden).toBeVisible();
  await expect(page.locator("[data-journal-result]:visible")).toHaveCount(1);
  await page.setViewportSize({ width: 320, height: 800 });
  for (const [mode, content] of [
    ["text", "html { font-size:200% !important; }"],
    ["spacing", "* { line-height:1.5 !important; letter-spacing:.12em !important; word-spacing:.16em !important; } p { margin-bottom:2em !important; }"],
  ]) {
    const style = await page.addStyleTag({ content });
    await page.evaluate(() => document.fonts.ready);
    await search.focus();
    await broaden.focus();
    await expect(broaden).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const bounds = await broaden.boundingBox();
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: testInfo.outputPath(`recovery-${mode}.png`) });
    await style.evaluate(node => node.remove());
  }
});

test("homepage prices continue to matching products and delivery terms stay beside the order", async ({ page }) => {
  await page.goto("#prices");
  await page.locator(".price-preview").getByRole("link", { name: "Чёрная икра" }).click();
  await expect(page.locator(".catalog-product:visible")).toHaveCount(4);
  const product = page.locator(".catalog-product:visible").first();
  await expect(product.locator("strong")).toHaveText("6 000 ₽ за 50 г");
  await expect(page.locator(".catalog-order-delivery")).toContainText("Доставка по Москве в пределах МКАД — 490 ₽, без минимальной суммы заказа.");
  await page.getByRole("link", { name: "Условия доставки", exact: true }).click();
  await expect(page).toHaveURL(/\/#delivery$/);
  await expect(page.locator(".delivery-source__terms")).toContainText("Стоимость доставки в пределах МКАД — 490 ₽.");
});

test("catalog separates dated journal matches from current price rows", async ({ page }) => {
  await page.goto("catalog/");
  const search = page.getByRole("searchbox", { name: "Найти товар" });
  for (const [query, count] of [["тунец", 1], ["щука", 1], ["слабосоленая", 3]]) {
    await search.fill(query);
    await expect(page.locator(".catalog-product:visible")).toHaveCount(count);
  }
  await search.fill("риет");
  await expect(page.locator(".catalog-product:visible")).toHaveCount(0);
  await expect(page.locator("[data-catalog-empty]")).toBeHidden();
  await expect(page.locator("[data-journal-result]:visible")).toHaveCount(1);
  await expect(page.getByRole("status")).toHaveText("В каталоге нет совпадений · Из журнала: 1");
  await expect(page.locator("[data-journal-result]:visible time")).toHaveAttribute("datetime", "2026-09-27");
  await page.locator("[data-journal-result]:visible a").click();
  await expect(page).toHaveURL(/journal\/697\/$/);
  await expect(page.locator(".ship-log-entry__body")).toContainText("Восемь разных вкусов");
  await page.goBack();
  await expect(search).toHaveValue("риет");
  await search.fill("такойрыбынет");
  await expect(page.locator("[data-catalog-empty]")).toBeVisible();
  await expect(page.locator("[data-catalog-journal]")).toBeHidden();
  await page.locator("[data-catalog-reset]").click();
  await expect(page.locator(".catalog-product:visible")).toHaveCount(114);
  await expect(page.locator("[data-catalog-journal]")).toBeHidden();
});

test("archive is compact, full articles preserve photographs and survive enlarged text", { tag: "@journal" }, async ({ page }) => {
  await page.goto("journal/");
  await expect(page.locator(".journal-index-entry")).toHaveCount(journal.length);
  await expect(page.locator(".ship-log-entry__body")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(7000);
  for (const path of [`journal/${journal[0].id}/`, "journal/683/"]) {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(path);
    await page.addStyleTag({ content: "html { font-size:200% !important; } p { line-height:1.5 !important; margin-bottom:2em !important; } * { letter-spacing:0.12em !important; word-spacing:0.16em !important; }" });
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const items = [];
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const range = document.createRange(); range.selectNodeContents(node);
        if (range.getBoundingClientRect().right > innerWidth + 1) items.push(`${node.parentElement.tagName}.${node.parentElement.className}: ${node.textContent.trim().slice(0, 100)}`);
      }
      return { width: document.documentElement.scrollWidth - innerWidth, items };
    });
    expect(overflow.width, `${mode}: ${overflow.items.join("; ")}`).toBeLessThanOrEqual(1);
    const photo = page.locator(".journal-story > img");
    expect(await photo.evaluate(image => getComputedStyle(image).objectFit)).not.toBe("cover");
    const inquiry = page.locator(".ship-log-entry__actions a").first();
    await inquiry.focus();
    await expect(inquiry).toBeFocused();
    await expect(inquiry).toBeInViewport();
    await expect(page.locator("h1")).toHaveCount(1);
  }
});

test("analytics reports intent once, ignores social reading, and excludes arbitrary search text", async ({ page }) => {
  // Route the public host to local static files; replace only the vendor tag with
  // an in-memory recorder so QA cannot pollute the production counter.
  await page.route("https://ks.fish/**", async route => {
    const url = new URL(route.request().url());
    const response = await page.request.get(`http://127.0.0.1:4173${url.pathname}${url.search}`);
    await route.fulfill({ response });
  });
  await page.route("https://mc.yandex.ru/**", route => route.fulfill({ contentType: "application/javascript", body: "window.goalCalls=[]; window.ym=(...args)=>window.goalCalls.push(args);" }));
  await page.goto("https://ks.fish/catalog/");
  await expect.poll(() => page.evaluate(() => Array.isArray(window.goalCalls))).toBe(true);
  const search = page.locator("[data-catalog-search]");
  await search.fill("тунец");
  await expect.poll(() => page.evaluate(() => window.goalCalls.filter(call => call[2] === "catalog_search").length)).toBe(1);
  await page.locator(".catalog-product:visible summary").click();
  await expect.poll(() => page.evaluate(() => window.goalCalls.filter(call => call[2] === "product_select").length)).toBe(1);
  await page.evaluate(() => document.addEventListener("click", event => { if(event.target.closest('a[href^="https://t.me"],a[href^="https://wa.me"]')) event.preventDefault(); }));
  await page.locator('.catalog-product:visible a[href^="https://t.me"]').click();
  expect(await page.evaluate(() => window.goalCalls.filter(call => call[2] === "order_click")[0][3])).toMatchObject({channel:"telegram",context:"catalog",product:"Филе тунца"});
  await search.fill("риет");
  await search.blur();
  await expect.poll(() => page.evaluate(() => window.goalCalls.filter(call => call[2] === "catalog_search_empty").length)).toBe(1);
  const calls = await page.evaluate(() => window.goalCalls.filter(call => call[1] === "reachGoal"));
  expect(calls.filter(call => call[2] === "catalog_search")).toHaveLength(2);
  expect(JSON.stringify(calls)).not.toContain("риет");
  expect(calls.find(call => call[2] === "catalog_search_empty")[3]).toMatchObject({products:0,journal:1});
  await page.getByRole("link",{name:"Телеграм-канал",exact:true}).click();
  expect(await page.evaluate(() => window.goalCalls.filter(call => call[2] === "order_click").length)).toBe(1);
  await page.goto("https://ks.fish/#contacts");
  await page.locator("[data-map-toggle]").click();
  await expect.poll(() => page.evaluate(() => window.goalCalls.filter(call => call[2] === "map_open").length)).toBe(1);
  await page.locator("[data-map-toggle]").click();
  expect(await page.evaluate(() => window.goalCalls.filter(call => call[2] === "map_open").length)).toBe(1);
});

test("blocking analytics leaves shopping and navigation usable", async ({ page }) => {
  await page.route("**/assets/analytics.js*", route => route.abort());
  await page.goto("catalog/");
  await page.locator("[data-catalog-search]").fill("щука");
  await expect(page.locator(".catalog-product:visible")).toHaveCount(1);
  await page.locator(".catalog-product:visible summary").click();
  await expect(page.locator('.catalog-product:visible a[href^="https://t.me"]')).toBeVisible();
  await page.locator("[data-menu-toggle]").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-menu-toggle]")).toBeFocused();
});
