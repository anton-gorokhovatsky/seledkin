import { categorySize, legacyCatalogSize } from "../helpers/catalog.mjs";
import { test, expect } from "@playwright/test";

test("a buyer can use an old category link and keep moved products in the saved order @catalog", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    if (!localStorage.getItem("seledkin-order-format")) {
      localStorage.setItem("seledkin-order-list", JSON.stringify(["other-016", "seafood-004"]));
      localStorage.setItem("seledkin-order-amounts", JSON.stringify({ "other-016": "1", "seafood-004": "2" }));
    }
  });
  await page.goto("catalog/?category=other&audit=taxonomy");
  const products = page.locator(".catalog-product:visible");
  const list = page.locator("#order-list");
  await expect(products).toHaveCount(legacyCatalogSize);
  await expect(page.locator('[data-category="other"]')).toHaveAttribute("aria-pressed", "true");
  await expect(list.locator("li")).toHaveCount(2);
  await expect(list.getByRole("textbox", { name: /^Количество.*Фарш форели/ })).toHaveValue("1");
  await expect(list.getByRole("textbox", { name: /^Количество.*Мясо краба/ })).toHaveValue("2");
  const categories = page.locator("[data-catalog-filters]");
  for (const [name, count] of [["Бакалея", categorySize("grocery")], ["Вяленая рыба", categorySize("dried-fish")], ["Консервы и бульон", categorySize("canned")], ["Кухонные принадлежности", categorySize("accessories")]]) {
    await categories.getByRole("button", { name, exact: true }).press("Enter");
    await expect(products).toHaveCount(count);
    await expect(page.locator('[data-category="other"]')).toBeHidden();
  }
  await categories.getByRole("button", { name: "Весь ассортимент", exact: true }).press("Enter");
  await page.getByRole("searchbox").fill("фарш форели");
  await expect(products).toHaveCount(1);
  await expect(products.locator("h4")).toHaveText("Фарш форели");
  await page.goto("catalog/?product=other-016&audit=taxonomy#product-other-016");
  await expect(page.locator("[data-catalog-select]")).toHaveValue("fillet");
  await expect(products).toHaveCount(1);
  await expect(products.locator("strong")).toHaveText("872 ₽ за 500 г");
  await expect(list.getByRole("textbox", { name: /^Количество.*Фарш форели/ })).toHaveValue("1");
  const draft = new URL(await list.getByRole("link", { name: "Открыть список в WhatsApp" }).getAttribute("href")).searchParams.get("text");
  expect(draft).toContain("Фарш форели");
  expect(draft).toContain("Количество: 1 шт.");
  expect(draft).toContain("Количество: 2 шт.");
});

test("catalog category selection and the expanded PBG description reflow without duplication @catalog", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  for (const theme of ["light", "dark"]) {
    await page.addInitScript(theme => localStorage.setItem("seledkin-theme", theme), theme);
    await page.goto("catalog/?category=grocery&audit=taxonomy-reflow");
    await expect(page.locator("[data-catalog-select]")).toHaveValue("grocery");
    await page.locator("[data-catalog-select]").selectOption("accessories");
    await expect(page.locator(".catalog-product:visible")).toHaveCount(categorySize("accessories"));
    await expect(page.getByRole("heading", { name: "Пинцет для удаления рыбных костей", exact: true })).toBeVisible();
    await page.locator("[data-catalog-select]").selectOption("prepared-fish");
    for (const id of ["smoked-mackerel", "prepared-fish-011"]) {
      const description = page.locator(`#product-${id} > p`).filter({ hasText: "Потрошёная рыба без головы" });
      await expect(description).toHaveCount(1);
      await expect(page.locator(`#product-${id} > p`).filter({ hasText: "ПБГ" })).toHaveCount(0);
      await expect(description).not.toContainText("ПБГ");
      await expect(description).toContainText("Потрошёная рыба без головы");
    }
    await page.locator("#product-smoked-mackerel").scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`pbg-320-${theme}.png`) });
    await page.addStyleTag({ content: "html { font-size: 200% !important; } * { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }" });
    await page.locator("[data-catalog-select]").selectOption("grocery");
    await expect(page.locator(".catalog-product:visible")).toHaveCount(categorySize("grocery"));
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});

test("early Facebook advice keeps its source, photograph and current product route @journal @recipes", async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const stories = [
    { id: "facebook-2018-12-15-nerka", date: "2018-12-15", product: "frozen-fish-007", price: "1 820 ₽/кг" },
    { id: "facebook-2018-02-16-herring", date: "2018-02-16", product: "prepared-fish-009", price: "699 ₽/кг" },
  ];
  for (const theme of ["light", "dark"]) for (const story of stories) {
    await page.addInitScript(theme => localStorage.setItem("seledkin-theme", theme), theme);
    await page.setViewportSize({ width: 320, height: 1000 });
    await page.goto(`journal/${story.id}/?audit=early-advice`);
    await expect(page.locator(".ship-log-entry__meta time")).toHaveAttribute("datetime", story.date);
    await expect(page.getByRole("link", { name: "Из Facebook", exact: true })).toHaveAttribute("href", /^https:\/\/www.facebook.com\//);
    await expect(page.locator(".ship-log-entry__body")).not.toContainText("587");
    const photo = page.locator(".journal-story > img");
    await photo.scrollIntoViewIfNeeded();
    const frame = await photo.evaluate(async image => {
      await image.decode();
      return { actual: image.clientWidth / image.clientHeight, source: image.naturalWidth / image.naturalHeight, fit: getComputedStyle(image).objectFit };
    });
    expect(frame.fit).not.toBe("cover");
    expect(Math.abs(frame.actual - frame.source)).toBeLessThan(.02);
    await page.screenshot({ path: testInfo.outputPath(`${story.id}-320-${theme}.png`) });
    await page.addStyleTag({ content: "html { font-size: 200% !important; } * { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    if (story.product === "prepared-fish-009") {
      await expect(page.locator(".recipe-current")).toHaveCount(0);
      await expect(page.locator(".ship-log-entry__body")).toBeVisible();
      continue;
    }
    await page.locator(`.recipe-current a[href*="product=${story.product}"]`).press("Enter");
    await expect(page.locator(".catalog-product:visible")).toHaveCount(1);
    await expect(page.locator(".catalog-product:visible strong")).toHaveText(story.price);
  }
});

test("the audio topics remain accessible beside the interview and podcast @journal", async ({ page }, testInfo) => {
  for (const theme of ["light", "dark"]) {
    await page.addInitScript(theme => localStorage.setItem("seledkin-theme", theme), theme);
    await page.goto("about/?audit=audio-library");
    const library = page.locator(".founder-source__library");
    await expect(library.locator("li")).toHaveCount(8);
    await expect(library.locator('.founder-source__chapters a')).toHaveCount(18);
    await expect(library.getByRole("link", { name: /Что оценивать при дегустации/ })).toHaveAttribute("href", /#t=6%3A58$/);
    for (const width of [1440, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await library.scrollIntoViewIfNeeded();
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      for (const link of await library.getByRole("link").all()) expect((await link.boundingBox()).height).toBeGreaterThanOrEqual(44);
      await page.screenshot({ path: testInfo.outputPath(`audio-library-${width}-${theme}.png`) });
    }
    await page.addStyleTag({ content: "html { font-size: 200% !important; } * { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }" });
    await library.getByRole("link", { name: "Камчатские деликатесы", exact: true }).focus();
    await expect(library.getByRole("link", { name: "Камчатские деликатесы", exact: true })).toBeInViewport();
    const overflow = await page.evaluate(() => ({ excess: document.documentElement.scrollWidth - innerWidth, items: [...document.querySelectorAll('main *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).map(el => ({ tag: el.tagName, class: el.className, text: el.textContent.slice(0, 90) })).slice(0, 12) }));
    expect(overflow.excess, JSON.stringify(overflow.items)).toBeLessThanOrEqual(1);
  }
});

test("the assortment photo starts with the first category and remains within its list when scrolling @recipes", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("?audit=assortment-sticky");
  await page.evaluate(() => document.fonts.ready);
  const layout = page.locator(".assortment-overview__layout");
  const photos = layout.locator(".assortment-overview__photos");
  const first = layout.locator(".assortment-directory__label").first();
  await page.evaluate(() => window.scrollTo({ top: document.querySelector('.assortment-overview__layout').getBoundingClientRect().top + scrollY - 150, behavior: "instant" }));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const top = await photos.boundingBox();
  expect(Math.abs((await first.boundingBox()).y - top.y), JSON.stringify(await first.evaluate(el => ({ label: el.getBoundingClientRect().toJSON(), parent: el.parentElement.getBoundingClientRect().toJSON(), padding: getComputedStyle(el.parentElement).padding, alignment: getComputedStyle(el.parentElement).alignItems, scrollY })))).toBeLessThan(1);
  // The selected nine-category list is shorter. Verify the pinned interval
  // before testing its lower boundary, rather than scrolling past it here.
  await page.evaluate(() => window.scrollBy({ top: 120, behavior: "instant" }));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const pinned = await photos.boundingBox();
  const inset = await photos.evaluate(el => parseFloat(getComputedStyle(el).top));
  expect(pinned.y).toBeCloseTo(inset, 0);
  await page.screenshot({ path: testInfo.outputPath("assortment-sticky-desktop.png") });
  await page.evaluate(() => window.scrollBy({ top: 600, behavior: "instant" }));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const bottom = await photos.boundingBox(), parent = await layout.boundingBox();
  expect(bottom.y + bottom.height).toBeLessThanOrEqual(parent.y + parent.height + 1);
  expect(bottom.y).toBeLessThan(inset);
  await page.setViewportSize({ width: 1440, height: 480 });
  expect(await photos.evaluate(el => el.clientHeight)).toBeLessThanOrEqual(480 - inset * 2);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(photos).not.toHaveCSS("position", "sticky");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});
