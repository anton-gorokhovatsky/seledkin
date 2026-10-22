import { test, expect } from "@playwright/test";
import { catalogVisibleSize } from "../helpers/catalog.mjs";

const familySelector = '[data-product-family="black-caviar"]';
const packages = [
  ["caviar-001", "50 г", "6 000 ₽ за 50 г"],
  ["caviar-002", "125 г", "15 000 ₽ за 125 г"],
  ["caviar-003", "250 г", "30 000 ₽ за 250 г"],
  ["caviar-004", "500 г", "60 000 ₽ за 500 г"],
];

test("one product offers exact packages, matching messages and keyboard selection @catalog", async ({ page }) => {
  await page.goto("catalog/?category=caviar&audit=packages");
  const family = page.locator(familySelector);
  await expect(family.getByRole("radio")).toHaveCount(4);
  await expect(family.getByRole("heading")).toHaveCount(1);
  for (const [id, weight, price] of packages) {
    await family.locator(`label[for="package-${id}"]`).click();
    const product = family.locator(".catalog-product:visible");
    await expect(product).toHaveAttribute("id", `product-${id}`);
    await expect(product.locator("strong")).toHaveText(price);
    await product.locator("summary").press("Enter");
    for (const link of await product.locator('.catalog-product-order__channels a:not([href^="tel:"])').all()) {
      const draft = new URL(await link.getAttribute("href")).searchParams.get("text");
      expect(draft).toContain("Черная икра");
      expect(draft).toContain(price);
    }
    await expect(family.getByRole("radio", { name: new RegExp(`^${weight.replace(/\s/gu, "\\s")}`) })).toBeChecked();
    await product.locator("summary").press("Enter");
  }
  const first = family.locator("#package-caviar-001");
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(family.locator("#package-caviar-002")).toBeChecked();
  await expect(family.locator("#package-caviar-002")).toBeFocused();
  await expect(family.locator(".catalog-product:visible strong")).toHaveText(packages[1][2]);
  await expect(family.locator('label[for="package-caviar-002"]')).toHaveCSS("outline-style", "solid");
});

test("package choice survives category history and old exact-package links @catalog", async ({ page }) => {
  await page.goto("catalog/?product=caviar-004&audit=package-history#order-caviar-004");
  const family = page.locator(familySelector);
  await expect(family.locator("#package-caviar-004")).toBeChecked();
  await expect(page.locator("#order-caviar-004")).toBeFocused();
  await expect(page.locator("#product-caviar-004 details")).toHaveAttribute("open", "");
  await family.locator('label[for="package-caviar-003"]').click();
  await expect(page).toHaveURL(/product=caviar-003.*#order-caviar-003$/);
  await expect(page.locator("#product-caviar-003 details")).toHaveAttribute("open", "");
  await page.reload();
  await expect(family.locator("#package-caviar-003")).toBeChecked();
  await page.getByRole("button", { name: "Весь каталог", exact: true }).press("Enter");
  await expect(page.locator(".catalog-product:visible")).toHaveCount(catalogVisibleSize);
  await page.getByRole("combobox", { name: "Категория", exact: true }).selectOption("canned");
  await page.goBack();
  await expect(family.locator("#package-caviar-003")).toBeChecked();
  await page.getByRole("searchbox").fill("черная икра 125 г");
  await expect(page.locator(".catalog-product:visible")).toHaveCount(1);
  await expect(family.locator("#package-caviar-002")).toBeChecked();
  await page.getByRole("searchbox").fill("черная икра");
  await expect(family.locator("#package-caviar-002")).toBeChecked();
  await family.locator('label[for="package-caviar-004"]').click();
  await page.reload();
  await expect(family.locator("#package-caviar-004")).toBeChecked();
});

test("package controls reflow with their product, normal and enlarged text @catalog", async ({ page }, testInfo) => {
  for (const [width, enlarged] of [[1440, false], [1024, false], [980, false], [390, false], [320, true]]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("catalog/?category=caviar&audit=package-layout");
    if (enlarged) await page.addStyleTag({ content: `html { font-size:200% !important; }
      * { line-height:1.5 !important; letter-spacing:.12em !important; word-spacing:.16em !important; }
      p { margin-bottom:2em !important; }` });
    await page.evaluate(() => document.fonts.ready);
    const family = page.locator(familySelector);
    for (const theme of ["light", "dark"]) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      await family.scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      const positions = await family.evaluate(element => {
        const box = element.getBoundingClientRect();
        const controls = [...element.querySelectorAll("label")].map(label => {
          const rect = label.getBoundingClientRect();
          return { width:rect.width, height:rect.height, inside:rect.left >= box.left && rect.right <= box.right + 1 };
        });
        return controls;
      });
      for (const control of positions) {
        expect(control.width).toBeGreaterThanOrEqual(44);
        expect(control.height).toBeGreaterThanOrEqual(44);
        expect(control.inside).toBe(true);
      }
      const heights = [];
      for (const [id] of packages) {
        await family.locator(`label[for="package-${id}"]`).click();
        heights.push((await family.boundingBox()).height);
        if (enlarged) {
          const lines = await family.locator('.catalog-product:visible').evaluate(product => {
            const name = product.querySelector('.catalog-product-name');
            const firstWord = document.createRange();
            firstWord.setStart(name.firstChild, 0);
            firstWord.setEnd(name.firstChild, 'Черная'.length);
            return {
              wordLines:firstWord.getClientRects().length,
              titleBottom:product.querySelector('h4').getBoundingClientRect().bottom,
              priceTop:product.querySelector('strong').getBoundingClientRect().top,
            };
          });
          // The first word fits this column at 200% even with user spacing.
          // A narrow one-letter column must not count as successful reflow.
          expect(lines.wordLines).toBe(1);
          expect(lines.priceTop).toBeGreaterThanOrEqual(lines.titleBottom);
        }
      }
      // Enlarged text may need more lines for the longer price. Preserve
      // natural reflow there rather than freezing a text container's height.
      if (!enlarged) expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
      if ((width === 1440 && theme === "light") || (width === 390 && theme === "light") || enlarged) {
        await page.screenshot({ path: testInfo.outputPath(`packages-${width}-${theme}${enlarged ? "-text-200" : ""}.png`) });
      }
    }
  }
  await page.goto("catalog/?category=canned&audit=crab-packages");
  const crab = page.locator('[data-product-family="premium-crab"]');
  const heights = [];
  for (const [id, price] of [["seafood-004", "2 800 ₽ за 220 г"], ["seafood-005", "5 900 ₽ за 370 г"], ["premium-crab-630", "9 350 ₽ за 630 г"]]) {
    await crab.locator(`label[for="package-${id}"]`).click();
    await expect(crab.locator(".catalog-product:visible strong")).toHaveText(price);
    heights.push((await crab.boundingBox()).height);
  }
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
});

test("native package selection and exact order drafts remain usable without JavaScript @catalog", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled:false, viewport:{width:390,height:844} });
  const page = await context.newPage();
  await page.goto(new URL("catalog/?audit=packages-no-js", baseURL).href);
  const family = page.locator(familySelector);
  for (const [id, , price] of packages) {
    await family.locator(`label[for="package-${id}"]`).click();
    const product = family.locator(".catalog-product:visible");
    await expect(product.locator("strong")).toHaveText(price);
    await product.locator("summary").click();
    expect(new URL(await product.getByRole("link", { name:"В WhatsApp" }).getAttribute("href")).searchParams.get("text")).toContain(price);
    await product.locator("summary").click();
  }
  await context.close();
});
