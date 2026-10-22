import { catalogVisibleSize } from "../helpers/catalog.mjs";
import { recipeForEntry } from "../../scripts/recipe-content.mjs";
import { test, expect } from "@playwright/test";
import { stubStoreMap } from "./map-fixture.mjs";
import { readFileSync } from "node:fs";

const journal = JSON.parse(readFileSync(new URL("../../content/journal.json", import.meta.url), "utf8")).filter(entry => !recipeForEntry(entry.id));

test("a selling journal story leads to its exact current product and order list @catalog @journal", async ({ page }, testInfo) => {
  await page.goto("journal/702/");
  const current = page.getByRole("region", { name: "В каталоге лавки", exact: true });
  await expect(current.locator("strong")).toHaveText("3 740 ₽/кг");
  const product = current.getByRole("link", { name: "Рулет из брюшков осетра", exact: true });
  await current.scrollIntoViewIfNeeded();
  await product.focus();
  await expect(product).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("journal-current-product.png") });
  await product.press("Enter");
  await expect(page).toHaveURL(/catalog\/\?product=prepared-fish-012#product-prepared-fish-012$/);
  const row = page.locator("#product-prepared-fish-012");
  await expect(row.getByRole("heading")).toBeInViewport();
  await expect(row.locator("strong")).toHaveText("3 740 ₽/кг");
  await expect(row.locator(".catalog-product-facts")).toHaveText("Горячего копчения · Упаковка 250–350 г");
  await row.getByRole("button", { name: /^В список заказа:/ }).press("Enter");
  const list = page.locator("#order-list");
  await expect(list.getByRole("textbox", { name: /Вес.*Рулет из брюшков осетра/ })).toBeVisible();
  const draft = new URL(await list.getByRole("link", { name: "Открыть список в WhatsApp" }).getAttribute("href")).searchParams.get("text");
  expect(draft).toMatch(/Рулет из\s+брюшков осетра/);
  expect(draft).toContain("3 740 ₽/кг");
  await page.goBack();
  await expect(current).toBeVisible();
  for (const [id, target] of [[697, "eel-rillettes"], [698, "caspian-herring"]]) {
    await page.goto(`journal/${id}/`);
    await expect(page.locator(`.recipe-current a[href="../../catalog/?product=${target}#product-${target}"]`)).toBeVisible();
  }
});

test("an empty category search can broaden without losing the query or browser history @catalog", async ({ page }, testInfo) => {
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
  await expect(page.locator(".catalog-product:visible")).toHaveCount(catalogVisibleSize);
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

test("homepage prices continue to the exact package and delivery terms stay beside the order @catalog", async ({ page }) => {
  await page.goto("#prices");
  await page.locator(".price-preview").getByRole("link", { name: "Чёрная икра" }).click();
  await expect(page.locator(".catalog-product:visible")).toHaveCount(1);
  const product = page.locator(".catalog-product:visible");
  await expect(product).toHaveAttribute("id", "product-caviar-001");
  await expect(product.locator("strong")).toHaveText("6 000 ₽ за 50 г");
  await expect(page.locator(".catalog-order-delivery")).toContainText("Доставка по Москве в пределах МКАД — 490 ₽, без минимальной суммы заказа.");
  await page.getByRole("link", { name: "Условия доставки", exact: true }).click();
  await expect(page).toHaveURL(/\/#delivery$/);
  await expect(page.locator(".delivery-waybill__price")).toHaveText("490 ₽");
  await expect(page.locator("#delivery .delivery-source__lead")).toHaveText("Мы доставляем нашу продукцию домой или в офис в течение двух часов.");
  await expect(page.locator("#delivery .delivery-waybill__area")).toHaveText("Москва, в пределах МКАД");
  await expect(page.locator("#delivery .delivery-source__terms")).toHaveText("Минимальной суммы заказа нет, это удобно.");
});

test("catalog separates dated journal matches from current price rows @catalog", async ({ page }) => {
  await page.goto("catalog/");
  const search = page.getByRole("searchbox", { name: "Найти товар" });
  for (const [query, count] of [["тунец", 4], ["щука", 2], ["слабосоленая", 2]]) {
    await search.fill(query);
    await expect(page.locator(".catalog-product:visible")).toHaveCount(count);
  }
  await search.fill("эталонная");
  await expect(page.locator(".catalog-product:visible")).toHaveCount(0);
  await expect(page.locator("[data-catalog-empty]")).toBeHidden();
  await expect(page.locator("[data-journal-result]:visible")).toHaveCount(1);
  await expect(page.locator("[data-catalog-count]")).toHaveText("В каталоге нет совпадений · Из журнала: 1");
  await expect(page.locator("[data-journal-result]:visible time")).toHaveAttribute("datetime", "2026-10-01");
  await page.locator("[data-journal-result]:visible a").click();
  await expect(page).toHaveURL(/journal\/699\/$/);
  await expect(page.locator(".ship-log-entry__body")).toContainText("Килограмм, как и раньше");
  await page.goBack();
  await expect(search).toHaveValue("эталонная");
  await search.fill("такойрыбынет");
  await expect(page.locator("[data-catalog-empty]")).toBeVisible();
  await expect(page.locator("[data-catalog-journal]")).toBeHidden();
  await page.locator("[data-catalog-reset]").click();
  await expect(page.locator(".catalog-product:visible")).toHaveCount(catalogVisibleSize);
  await expect(page.locator("[data-catalog-journal]")).toBeHidden();
});

test("the photoatlas leads to a compact older archive and complete, accessible stories", { tag: "@journal" }, async ({ page }, testInfo) => {
  await page.goto("journal/");
  await expect(page.locator(".journal-index-entry")).toHaveCount(journal.length);
  await expect(page.locator(".ship-log-entry__body")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  // The chosen five-photo entrance has a different role from the older index.
  // Keep all records reachable, with the remaining list easy to scan.
  await expect(page.locator(".atlas-record")).toHaveCount(5);
  await expect(page.locator(".atlas-record__number")).toHaveCount(0);
  const rowHeights = await page.locator(".journal-atlas__earlier .journal-index-entry").evaluateAll(rows => rows.map(row => row.getBoundingClientRect().height));
  expect(Math.max(...rowHeights)).toBeLessThan(300);
  expect(rowHeights.reduce((sum, height) => sum + height, 0) / rowHeights.length).toBeLessThan(220);
  for (const [width, enlarged] of [[1440, false], [768, false], [390, false], [320, true]]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("journal/");
    if (enlarged) await page.addStyleTag({ content: "html { font-size:200% !important; } p { line-height:1.5 !important; margin-bottom:2em !important; } * { letter-spacing:0.12em !important; word-spacing:0.16em !important; }" });
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => ({
      excess: document.documentElement.scrollWidth - innerWidth,
      textOverflow: [...document.querySelectorAll('main *')].flatMap(element => [...element.childNodes].filter(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim()).flatMap(node => {
        const range = document.createRange(); range.selectNodeContents(node);
        return [...range.getClientRects()].filter(rect => rect.right > innerWidth + 1).map(rect => ({ tag: element.tagName, cls: element.className, text: node.textContent.slice(0, 100), right: rect.right }));
      })),
      elements: [...document.querySelectorAll('main *')].filter(el => {
        const r = el.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1;
      }).map(el => ({ tag: el.tagName, cls: el.className, text: el.textContent.slice(0, 90) })),
    }));
    expect(overflow.excess, JSON.stringify({ width, enlarged, elements: overflow.elements, text: overflow.textOverflow })).toBeLessThanOrEqual(1);
    if (width === 1440 || width === 390) {
      await page.screenshot({ path: testInfo.outputPath(`journal-${width}.png`) });
    }
    if (enlarged) {
      await page.locator('.atlas-record h2').first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath('journal-320-enlarged.png') });
    }
    for (const photo of await page.locator(".atlas-record img").all()) {
      await photo.scrollIntoViewIfNeeded();
      const frame = await photo.evaluate(async image => {
        await image.decode();
        return { rendered: image.clientWidth / image.clientHeight, original: image.naturalWidth / image.naturalHeight, fit: getComputedStyle(image).objectFit };
      });
      expect(frame.fit).not.toBe("cover");
      expect(Math.abs(frame.rendered - frame.original)).toBeLessThan(.02);
    }
  }
  const recent = page.locator(".atlas-record > a").first();
  await recent.focus();
  await expect(recent).toBeFocused();
  await expect(recent).toBeInViewport();
  await recent.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/journal/${journal[0].id}/$`));
  for (const path of [`journal/${journal[0].id}/`, "journal/683/"]) {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(path);
    await page.addStyleTag({ content: "html { font-size:200% !important; } p { line-height:1.5 !important; margin-bottom:2em !important; } * { letter-spacing:0.12em !important; word-spacing:0.16em !important; }" });
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const photo = page.locator(".journal-story > img");
    expect(await photo.evaluate(image => getComputedStyle(image).objectFit)).not.toBe("cover");
    const inquiry = page.locator(".ship-log-entry__actions a").first();
    await inquiry.focus();
    await expect(inquiry).toBeFocused();
    await expect(inquiry).toBeInViewport();
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator(".ship-log-entry__meta")).not.toContainText("Запись №");
  }
});

test("analytics reports intent once, ignores social reading, and excludes arbitrary search text @analytics", async ({ page, baseURL }) => {
  // Route the public host to local static files; replace only the vendor tag with
  // an in-memory recorder so QA cannot pollute the production counter.
  await page.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => false }));
  // Clipboard behavior has its own order tests. Here the completed desktop
  // handoff must report one intent and leave the analytics recorder available.
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: { async writeText() {} } }));
  await page.route("https://t.me/+79166751452?**", route => route.fulfill({ status: 204 }));
  await page.route("https://ks.fish/**", async route => {
    const url = new URL(route.request().url());
    const response = await page.request.get(new URL(`${url.pathname}${url.search}`, baseURL).href);
    await route.fulfill({ response });
  });
  await stubStoreMap(page);
  await page.route("https://mc.yandex.ru/**", route => route.fulfill({ contentType: "application/javascript", body: "window.goalCalls=[]; window.ym=(...args)=>window.goalCalls.push(args);" }));
  await page.goto("https://ks.fish/catalog/");
  await expect.poll(() => page.evaluate(() => Array.isArray(window.goalCalls))).toBe(true);
  const search = page.locator("[data-catalog-search]");
  await search.fill("филе тунца");
  await search.press("Enter");
  await expect.poll(() => page.evaluate(() => window.goalCalls.filter(call => call[2] === "catalog_search").length)).toBe(1);
  await page.locator(".catalog-product:visible summary").click();
  await expect.poll(() => page.evaluate(() => window.goalCalls.filter(call => call[2] === "product_select").length)).toBe(1);
  await page.evaluate(() => document.addEventListener("click", event => { if(event.target.closest('a[href^="https://t.me"],a[href^="https://wa.me"]')) event.preventDefault(); }));
  await page.locator('.catalog-product:visible a[href^="https://t.me"]').click();
  await expect.poll(() => page.evaluate(() => window.goalCalls.filter(call => call[2] === "order_click")[0]?.[3])).toMatchObject({channel:"telegram",context:"catalog",product:"Филе тунца"});
  await search.fill("эталонная");
  await search.blur();
  await expect.poll(() => page.evaluate(() => window.goalCalls.filter(call => call[2] === "catalog_search_empty").length)).toBe(1);
  const calls = await page.evaluate(() => window.goalCalls.filter(call => call[1] === "reachGoal"));
  expect(calls.filter(call => call[2] === "catalog_search")).toHaveLength(2);
  expect(JSON.stringify(calls)).not.toContain("эталонная");
  expect(calls.find(call => call[2] === "catalog_search_empty")[3]).toMatchObject({schema:2,products:0,journal:1,total_products:0,result:"journal_only"});
  await page.getByRole("link",{name:"Телеграм-канал",exact:true}).click();
  expect(await page.evaluate(() => window.goalCalls.filter(call => call[2] === "order_click").length)).toBe(1);
  await page.goto("https://ks.fish/#contacts");
  // Loading the always-active map is not an intentional route request.
  expect(await page.evaluate(() => window.goalCalls.filter(call => call[2] === "map_open").length)).toBe(0);
  // Cancel the external navigation after the document's analytics listener,
  // regardless of module loading order. The fixture must not cancel the intent.
  await page.evaluate(() => window.addEventListener("click", event => { if(event.target.closest('a[href^="https://yandex.ru/maps/"]')) event.preventDefault(); }));
  await page.getByRole("link", { name: "Открыть в Яндекс Картах" }).click();
  // Wait for event delivery in WebKit; retain the exact-once assertion.
  await expect.poll(() => page.evaluate(() => window.goalCalls.filter(call => call[2] === "map_open").length)).toBe(1);
});

test("blocking analytics leaves shopping and navigation usable @analytics", async ({ page }) => {
  await page.route("**/assets/analytics.js*", route => route.abort());
  await page.goto("catalog/");
  await page.locator("[data-catalog-search]").fill("икра щуки");
  await expect(page.locator(".catalog-product:visible")).toHaveCount(1);
  await page.locator(".catalog-product:visible summary").click();
  await expect(page.locator('.catalog-product:visible a[href^="https://t.me"]')).toBeVisible();
  await page.locator("[data-menu-toggle]").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-menu-toggle]")).toBeFocused();
});
