import { test, expect } from "@playwright/test";

test("desktop order entry offers the existing phone and equal messengers @catalog", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("?audit=order-entry");
  const order = page.locator(".source-hero__actions").getByRole("link", { name: "Заказать", exact: true });
  await order.press("Enter");
  const choices = page.getByRole("group", { name: "Способы заказа" });
  await expect(choices).toBeFocused();
  for (const [name, href] of [["Позвонить в лавку: +7 916 675‑14‑52", "tel:+79166751452"], ["Заказать в Телеграме", "https://t.me/+79166751452"], ["Заказать в WhatsApp", "https://wa.me/79166751452"]]) {
    const link = choices.getByRole("link", { name, exact: true });
    await expect(link).toHaveAttribute("href", href);
    await expect(link).toBeInViewport();
  }
  // macOS WebKit uses Option+Tab to include links when full keyboard access is off.
  await page.keyboard.press(testInfo.project.name === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab");
  await expect(choices.getByRole("link").first()).toBeFocused();
});

test("mobile order entry retains the photographed product before choosing a channel @afisha", async ({ page, browser, baseURL }, testInfo) => {
  await page.goto("?audit=order-entry");
  await page.locator(".afisha__frame").press("ArrowRight");
  const price = await page.locator(".afisha__price").textContent();
  const href = await page.locator(".afisha__order").getAttribute("href");
  await page.locator(".afisha__order").press("Enter");
  const product = page.locator("#product-trout-roe");
  await expect(page.locator(".catalog-product:visible")).toHaveCount(1);
  await expect(product.locator("h4")).toHaveText("Икра форели");
  await expect(product.locator("strong")).toHaveText(price);
  await expect(product.locator("details")).toHaveAttribute("open", "");
  await expect(product.locator("summary")).toBeFocused();
  await expect(product.locator('.catalog-product-order a[href^="tel:"]')).toBeVisible();
  for (const link of await product.locator('.catalog-product-order a:not([href^="tel:"])').all()) {
    await expect(link).toBeVisible();
    expect(new URL(await link.getAttribute("href")).searchParams.get("text")).toContain("Икра форели");
  }
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath("mobile-order-390.png") });
  await page.getByRole("button", { name: "Весь каталог", exact: true }).click();
  expect(new URL(page.url()).hash).toBe("");
  await expect(page.locator(".catalog-product:visible")).toHaveCount(116);

  const fallback = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const plain = await fallback.newPage();
  await plain.goto(new URL(href, baseURL).href);
  const summary = plain.locator("#order-trout-roe");
  await expect(summary).toBeInViewport();
  if (!await plain.locator("#product-trout-roe details").getAttribute("open").then(value => value !== null)) await summary.press("Enter");
  await expect(plain.locator("#product-trout-roe .catalog-product-order a")).toHaveCount(3);
  await fallback.close();
});

test("catalog advice stays readable in both watches with 320px reflow and enlarged spacing @catalog", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  for (const theme of ["light", "dark"]) {
    await page.addInitScript(theme => localStorage.setItem("seledkin-theme", theme), theme);
    await page.goto("catalog/?audit=catalog-guidance");
    await expect(page.locator(".catalog-product-advice blockquote")).toHaveCount(26);
    await page.locator("#product-fillet-001").scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: testInfo.outputPath(`catalog-guidance-320-${theme}.png`) });
    await page.addStyleTag({ content: "html { font-size: 200% !important; } * { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }" });
    const quotes = await page.locator(".catalog-product-advice blockquote").evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect();
      const link = element.nextElementSibling.getBoundingClientRect();
      return { left: rect.left, right: rect.right, bottom: rect.bottom, linkTop: link.top, clipped: element.scrollWidth - element.clientWidth };
    }));
    for (const quote of quotes) {
      expect(quote.left).toBeGreaterThanOrEqual(0);
      expect(quote.right).toBeLessThanOrEqual(321);
      expect(quote.clipped).toBeLessThanOrEqual(1);
      expect(quote.linkTop).toBeGreaterThanOrEqual(quote.bottom - 1);
    }
    const overflow = await page.evaluate(() => ({ excess: document.documentElement.scrollWidth - innerWidth, items: [...document.querySelectorAll('main *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).map(el => ({ tag: el.tagName, class: el.className, text: el.textContent.slice(0, 90) })).slice(0, 12) }));
    expect(overflow.excess, JSON.stringify(overflow.items)).toBeLessThanOrEqual(1);
  }
});
