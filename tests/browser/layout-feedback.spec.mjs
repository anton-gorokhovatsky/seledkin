import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.beforeEach(async ({ context }) => {
  await context.route("https://mc.yandex.ru/**", route => route.abort());
});

test("delivery stays inside 320px with enlarged text and a wider fallback serif @typography", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route("**/qa-reflow-serif.ttf", async route => route.fulfill({
    contentType: "font/ttf",
    body: await readFile(new URL("../fixtures/fonts/DejaVuSerif.ttf", import.meta.url)),
  }));
  await page.goto("?audit=delivery-fallback#delivery");
  // Linux's wider serif reproduced a 42px overflow that the Mac font hid.
  // The test fixture does not change the site's typography or shipped assets.
  await page.addStyleTag({ content: `
    @font-face { font-family: "QA Reflow Serif"; src: url("/qa-reflow-serif.ttf"); }
    html { font-size: 200% !important; }
    .delivery-waybill h2, .watch-catch__name { font-family: "QA Reflow Serif", serif; }
  ` });
  await page.evaluate(() => document.fonts.ready);
  const heading = page.locator(".delivery-waybill h2");
  const lines = await heading.evaluate(node => {
    const range = document.createRange();
    range.selectNodeContents(node);
    return [...range.getClientRects()].map(line => ({ left: line.left, right: line.right }));
  });
  for (const line of lines) {
    expect(line.left).toBeGreaterThanOrEqual(-1);
    // Italic ink may extend into the inset, but must remain on screen.
    expect(line.right).toBeLessThanOrEqual(320);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  const photo = page.locator("#delivery img");
  await photo.scrollIntoViewIfNeeded();
  await expect.poll(() => photo.evaluate(image => image.decode().then(() => image.naturalWidth > 0, () => false))).toBe(true);
  await page.locator("#delivery").screenshot({ path: testInfo.outputPath("delivery-320-enlarged-fallback.png") });
});

test("the empty order and footer remain grouped at intermediate width and enlarged text @catalog @signature", async ({ page }, testInfo) => {
  for (const [width, enlarged] of [[638, false], [320, true]]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("catalog/?q=Черная+икра&category=caviar&audit=layout#order-list");
    if (enlarged) await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    await page.evaluate(() => document.fonts.ready);
    const order = page.locator("#order-list");
    const alignment = await order.evaluate(region => {
      const title = region.querySelector("h2").getBoundingClientRect();
      const copy = region.querySelector(".catalog-order-copy").getBoundingClientRect();
      return Math.abs(title.left - copy.left);
    });
    expect(alignment).toBeLessThan(1);
    const footerButtons = page.locator(".source-footer__actions .source-button");
    for (const button of await footerButtons.all()) {
      expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
      if (!enlarged) expect(await button.locator(".source-button__label").evaluate(label => label.getBoundingClientRect().height <= parseFloat(getComputedStyle(label).lineHeight) + 1)).toBe(true);
    }
    const signature = page.locator("ag-signature");
    await expect(signature).toHaveAttribute("data-signature-version", /^1\./);
    const authorLink = signature.getByRole("link", { name: "Антон Гороховатский Дизайн и разработка" });
    const backLink = page.locator(".source-footer__base > a");
    await expect(authorLink).toHaveCount(1);
    await expect(backLink).toHaveCount(1);
    const author = await authorLink.boundingBox();
    const back = await backLink.boundingBox();
    for (const box of [author, back]) expect(box.height).toBeGreaterThanOrEqual(44);
    expect(author.x + author.width <= back.x || back.x + back.width <= author.x
      || author.y + author.height <= back.y || back.y + back.height <= author.y).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    if (!enlarged) await order.screenshot({ path: testInfo.outputPath("empty-order-638.png") });
  }
});

test("compact journal photos retain their full frame and recipe words never break without a hyphen @journal @typography", async ({ page }) => {
  await page.setViewportSize({ width: 638, height: 900 });
  await page.goto("?audit=compact-journal#journal");
  await page.evaluate(() => document.fonts.ready);
  const preview = page.locator(".journal-preview__entry img").first();
  const checkPhoto = async (photo, minimum) => {
    await photo.scrollIntoViewIfNeeded();
    const frame = await photo.evaluate(async img => {
      await img.decode();
      const box = img.getBoundingClientRect();
      return { width: box.width, ratio: box.width / box.height, original: img.naturalWidth / img.naturalHeight };
    });
    expect(frame.width).toBeGreaterThanOrEqual(minimum);
    expect(Math.abs(frame.ratio - frame.original)).toBeLessThan(.02);
  };
  await checkPhoto(preview, 160);
  const name = page.locator('.watch-catch__name').filter({ hasText: "Филе трески" });
  expect(await name.textContent()).toContain("ско\u00adво\u00adро\u00adде");
  expect(await name.evaluate(node => getComputedStyle(node).overflowWrap)).not.toBe("anywhere");
  expect(await page.locator('.afisha__title em').textContent()).toContain("каж\u00adдый");
  await page.goto("journal/?audit=compact-journal#journal-earlier");
  await checkPhoto(page.locator(".journal-atlas__earlier .journal-index-entry img").first(), 144);
  for (const path of ["?audit=compact-journal", "journal/?audit=compact-journal"]) {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(path);
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});

test("ingredient filters keep their position and the selected editorial compositions @recipes", async ({ page }, testInfo) => {
  for (const width of [1440, 638]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("recipes/?audit=filter-layout");
    await page.evaluate(() => document.fonts.ready);
    const chooser = page.locator("[data-recipe-chooser]");
    const chooserTop = await chooser.evaluate(node => node.getBoundingClientRect().top + scrollY);
    const lead = page.locator('[data-recipe-feature="701"]');
    const leadWidth = (await lead.boundingBox()).width;
    await page.getByRole("button", { name: /^Рыба/ }).press("Enter");
    expect(await chooser.evaluate(node => node.getBoundingClientRect().top + scrollY)).toBeCloseTo(chooserTop, 0);
    await expect(lead).toBeVisible();
    expect((await lead.boundingBox()).width).toBeCloseTo(leadWidth, 0);
    await expect(page.locator('[data-recipe-feature="692"]')).toBeVisible();
    await expect(page.locator('[data-recipe-feature="664"]')).toBeHidden();
    await expect(page.locator('[data-recipe-material][data-featured]:visible')).toHaveCount(0);
    await expect(page.locator("[data-recipe-filter-status]")).toHaveText("14 материалов");
    if (width === 1440) await page.locator("#main").screenshot({ path: testInfo.outputPath("recipes-fish-wide.png") });
    await page.getByRole("button", { name: /^Осьминог/ }).press("Enter");
    await expect(page.locator('[data-recipe-material="377"]')).toBeVisible();
    await expect(page.locator('[data-recipe-opening]')).toBeHidden();
    await expect(page.locator("[data-recipe-filter-status]")).toHaveText("1 материал");
    expect(await chooser.evaluate(node => node.getBoundingClientRect().top + scrollY)).toBeCloseTo(chooserTop, 0);
    await page.goBack();
    await expect(lead).toBeVisible();
    await page.getByRole("button", { name: /^Все материалы/ }).press("Enter");
    await expect(page.locator("[data-recipe-feature]:visible")).toHaveCount(3);
    await expect(page.locator(".recipe-record:visible")).toHaveCount(22);
    expect(await chooser.evaluate(node => node.getBoundingClientRect().top + scrollY)).toBeCloseTo(chooserTop, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});

test("recipe feedback preserves rapid filtering, keyboard focus and the reduced-motion preference @recipes", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 638, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("recipes/?audit=feedback&ingredient=pasta");
  const pasta = page.locator('[data-recipe-feature="664"]');
  await expect(pasta).toBeVisible();
  await expect(pasta.locator("figure img")).toHaveJSProperty("complete", true);
  expect((await pasta.locator("img").boundingBox()).width).toBeGreaterThan(140);
  await expect(page.locator(".recipe-record-unlinked, .recipe-record-directory + .recipe-archive-note")).toHaveCount(0);
  const story = pasta.locator("h2 a");
  expect(await story.getAttribute("href")).toBe(await pasta.locator("figure a").getAttribute("href"));
  await pasta.screenshot({ path: testInfo.outputPath("pasta-638.png") });
  // Slow the feedback for observation; the product must stay operable mid-flight.
  await page.addStyleTag({ content: ":root { --reveal-duration: 2000ms; }" });
  const mussels = page.getByRole("button", { name: /^Мидии/ });
  await mussels.press("Enter");
  await expect(page.locator(".recipe-record:visible")).toHaveCount(3);
  await expect(mussels).toBeFocused();
  expect(await page.locator(".recipe-record-directory").evaluate(node => node.getAnimations().some(animation => animation.playState === "running"))).toBe(true);
  await page.getByRole("button", { name: /^Креветки/ }).press("Enter");
  await page.getByRole("button", { name: /^Паста/ }).press("Enter");
  await expect(pasta).toBeVisible();
  await expect(page.locator("[data-recipe-feature]:visible, .recipe-record:visible")).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => page.locator("[data-recipe-opening]").evaluate(node => node.getAnimations().filter(animation => animation.playState === "running").length)).toBe(0);
  await mussels.press("Enter");
  await expect(page.locator(".recipe-record:visible")).toHaveCount(3);
  expect(await page.locator(".recipe-record-directory").evaluate(node => node.getAnimations().length)).toBe(0);
  await page.locator('[data-recipe-material="574"] .recipe-record-story').press("Enter");
  await expect(page).toHaveURL(/recipes\/574\/$/);
});
