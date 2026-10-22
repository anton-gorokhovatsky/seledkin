import { test, expect } from "@playwright/test";

test("package selection and ordinary product actions form distinct compact groups @catalog", async ({ page }, testInfo) => {
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height:900 });
    await page.goto("catalog/?category=caviar&audit=hierarchy");
    await page.evaluate(() => document.fonts.ready);
    const family = page.locator('[data-product-family="black-caviar"]');
    for (const theme of ["light", "dark"]) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      const weight = await family.locator("label").last().boundingBox();
      const controls = await family.locator(".catalog-product:visible .catalog-product-controls").boundingBox();
      expect(controls.y).toBeGreaterThan(weight.y + weight.height);
      for (const product of [family.locator(".catalog-product:visible"), page.locator("#product-coho-roe-2026")]) {
        const add = product.locator("[data-order-add]");
        const availability = product.locator("summary");
        const a = await add.boundingBox(), b = await availability.boundingBox();
        expect(Math.abs(a.y + a.height / 2 - b.y - b.height / 2)).toBeLessThan(2);
        expect(b.x - a.x - a.width).toBeGreaterThanOrEqual(12);
        expect(b.x - a.x - a.width).toBeLessThanOrEqual(20);
        await availability.click();
        await expect(product.getByRole("link", { name:"В WhatsApp" })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
        await availability.click();
      }
      await family.scrollIntoViewIfNeeded();
      await page.screenshot({ path:testInfo.outputPath(`catalog-hierarchy-${width}-${theme}.png`) });
    }
  }
});

test("a wrapped homepage product keeps the price on its first line and the leader beside the text @catalog", async ({ page }, testInfo) => {
  for (const width of [1024, 1440, 390]) {
    await page.setViewportSize({ width, height:900 });
    await page.goto("?audit=price-leader#prices");
    await page.evaluate(() => document.fonts.ready);
    const product = page.locator(".price-preview .catalog-product").filter({hasText:"Скумбрия"});
    for (const theme of ["light", "dark"]) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      await product.scrollIntoViewIfNeeded();
      const lines = await product.evaluate(element => {
        const name = element.querySelector(".catalog-product-name");
        const range = document.createRange(); range.selectNodeContents(name);
        const line = range.getClientRects()[0];
        return { first:line.top, price:element.querySelector("strong").getBoundingClientRect().top };
      });
      expect(Math.abs(lines.first - lines.price)).toBeLessThan(6);
      await page.screenshot({ path:testInfo.outputPath(`price-leader-${width}-${theme}.png`) });
    }
  }
});

test("harpoons scale with adjacent text across pages and retain usable control targets @navigation", async ({ page }, testInfo) => {
  for (const width of [1440, 390]) for (const route of ["catalog/?category=caviar", "", "recipes/", "journal/", "journal/702/", "404.html"]) {
    await page.setViewportSize({ width, height:900 });
    await page.goto(`${route}${route.includes("?") ? "&" : "?"}audit=harpoon-scale`);
    await page.evaluate(() => document.fonts.ready);
    const sizing = await page.locator('svg[viewBox="0 0 32 18"]:visible').evaluateAll(elements => elements.map(element => {
      const style = getComputedStyle(element);
      const iconOnly = element.closest('.source-hero__journal-control:not(.source-hero__journal-control--all), .afisha__change, .catalog-order-shortcut');
      return { parent:element.parentElement.className, width:parseFloat(style.width), font:parseFloat(style.fontSize), root:parseFloat(getComputedStyle(document.documentElement).fontSize), iconOnly:Boolean(iconOnly) };
    }));
    expect(sizing.length).toBeGreaterThan(0);
    for (const item of sizing) expect(item.width / (item.iconOnly ? item.root : item.font), JSON.stringify(item))
      .toBeCloseTo(item.iconOnly ? 1.5 : 1.4, 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    if (route.startsWith("catalog")) {
      const link = page.getByRole("link", {name:"Выбрать рыбу к ужину", exact:true});
      await link.scrollIntoViewIfNeeded();
      await page.screenshot({ path:testInfo.outputPath(`harpoon-catalog-${width}.png`) });
    }
    if (width === 1440 && ["recipes/", "journal/"].includes(route)) {
      const link = page.locator(route === "recipes/" ? ".recipe-record-read:visible" : ".atlas-record__read:visible").first();
      await link.scrollIntoViewIfNeeded();
      await page.screenshot({ path:testInfo.outputPath(`harpoon-${route.slice(0,-1)}.png`) });
    }
  }
});
