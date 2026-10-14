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

test("mobile order keeps the pictured product through selection and messenger handoff @afisha", async ({ page, browser, baseURL }, testInfo) => {
  await page.goto("?audit=order-entry");
  await expect(page.locator(".afisha__catalog")).toHaveAttribute("href", "catalog/");
  const order = page.locator(".afisha__order");
  await expect(order.getByRole("link").first()).toBeHidden();
  await order.locator("summary").press("Enter");
  await expect(order).toHaveAttribute("open", "");
  await page.keyboard.press(testInfo.project.name === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab");
  await expect(order.getByRole("link").first()).toBeFocused();
  const products = ["Каспийский залом", "Икра форели", "Стейк лосося", "Форель холодного копчения", "Скумбрия горячего копчения"];
  for (const name of products) {
    await expect(page.locator(".afisha__name")).toHaveText(name);
    const price = await page.locator(".afisha__price").textContent();
    for (const [selector, host] of [[".afisha__order-telegram", "t.me"], [".afisha__order-whatsapp", "wa.me"]]) {
      const link = order.locator(selector);
      await expect(link).toBeVisible();
      const url = new URL(await link.getAttribute("href"));
      expect(url.hostname).toBe(host);
      expect(url.searchParams.get("text")).toContain(name);
      expect(url.searchParams.get("text")).toContain(price);
      expect(url.searchParams.get("text")).not.toMatch(/(?:Вес|Количество):/);
    }
    expect(new URL(page.url()).hash).toBe("");
    await page.locator(".afisha__frame").press("ArrowRight");
  }
  // A real navigation carries the draft. The stub never contacts the shop.
  await page.locator(".afisha__frame").press("ArrowRight");
  await page.locator(".afisha__frame").press("ArrowRight");
  await page.route("https://wa.me/**", route => route.fulfill({ contentType: "text/html", body: "Messenger destination" }));
  await order.locator(".afisha__order-whatsapp").click();
  await expect(page).toHaveURL(/^https:\/\/wa\.me\/79166751452\?text=/);
  expect(new URL(page.url()).searchParams.get("text")).toContain("Стейк лосося");

  const fallback = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const plain = await fallback.newPage();
  await plain.goto(new URL("?audit=order-entry", baseURL).href);
  await plain.locator(".afisha__order summary").click();
  for (const link of await plain.locator(".afisha__order a").all()) {
    await expect(link).toBeVisible();
    expect(new URL(await link.getAttribute("href")).searchParams.get("text")).toContain("Каспийский залом");
  }
  await fallback.close();
});

test("afisha Telegram copying recovers and never keeps the previous photograph's draft @afisha", async ({ page }) => {
  const copied = [];
  await page.exposeFunction("rememberOrderDraft", draft => copied.push(draft));
  await page.addInitScript(() => {
    window.refuseOrderCopy = true;
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async draft => {
      if (window.refuseOrderCopy) throw new Error("Clipboard denied");
      await window.rememberOrderDraft(draft);
    } } });
  });
  await page.goto("?audit=order-entry");
  await page.locator(".afisha__order summary").press("Enter");
  await page.locator(".afisha__order-telegram").click();
  await expect(page.getByRole("textbox", { name: "Текст для сообщения" })).toHaveValue(/Каспийский залом/);
  await expect(page.locator(".afisha__order-status")).toContainText("Автоматическое копирование недоступно");
  await page.locator(".afisha__change").click();
  await expect(page.getByRole("textbox", { name: "Текст для сообщения" })).toBeHidden();
  await expect(page.locator(".afisha__order-status")).toBeEmpty();
  await page.evaluate(() => { window.refuseOrderCopy = false; });
  await page.route("https://t.me/**", route => route.fulfill({ contentType: "text/html", body: "Messenger destination" }));
  await page.locator(".afisha__order-telegram").click();
  await expect(page).toHaveURL(/^https:\/\/t\.me\/\+79166751452\?text=/);
  expect(copied).toHaveLength(1);
  expect(copied[0]).toContain("Икра форели");
  expect(copied[0]).not.toContain("Каспийский залом");
});

test("afisha order stays with its photo and remains readable at 320px with enlarged text @afisha", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  for (const theme of ["light", "dark"]) {
    await page.addInitScript(theme => localStorage.setItem("seledkin-theme", theme), theme);
    await page.goto("?audit=order-entry");
    await page.addStyleTag({ content: "html { font-size: 200% !important; } * { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; }" });
    await page.locator(".afisha__frame").press("ArrowLeft");
    await page.locator(".afisha__order summary").press("Enter");
    for (const item of await page.locator(".afisha__order summary, .afisha__order a").all()) {
      const box = await item.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(321);
      expect(await item.evaluate(e => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(1);
    }
    // Scope the stress check to the changed shopping entry. The delivery price
    // has a separate pre-existing overflow with 200% text AND enlarged spacing.
    const outside = await page.locator(".afisha").evaluate(afisha => [...afisha.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).map(e => ({ class: e.className, text: e.textContent.slice(0, 70) })));
    expect(outside).toEqual([]);
    // Compare one layout frame: Safari may scroll the focused disclosure.
    const { orderBottom, catalogTop } = await page.evaluate(() => ({
      orderBottom: document.querySelector(".afisha__order").getBoundingClientRect().bottom,
      catalogTop: document.querySelector(".afisha__catalog").getBoundingClientRect().top,
    }));
    expect(catalogTop).toBeGreaterThanOrEqual(orderBottom);
  }
});

test("catalog advice stays readable in both watches with 320px reflow and enlarged spacing @catalog", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  for (const theme of ["light", "dark"]) {
    await page.addInitScript(theme => localStorage.setItem("seledkin-theme", theme), theme);
    await page.goto("catalog/?audit=catalog-guidance");
    await expect(page.locator(".catalog-product-advice blockquote")).toHaveCount(35);
    await page.locator("#product-fillet-001").scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: testInfo.outputPath(`catalog-guidance-320-${theme}.png`) });
    await page.addStyleTag({ content: "html { font-size: 200% !important; } * { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }" });
    const quotes = await page.locator(".catalog-product-advice blockquote").evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect();
      const link = element.nextElementSibling?.getBoundingClientRect();
      return { left: rect.left, right: rect.right, bottom: rect.bottom, linkTop: link?.top ?? rect.bottom, clipped: element.scrollWidth - element.clientWidth };
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
