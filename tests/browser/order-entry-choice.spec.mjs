import { test, expect } from "@playwright/test";

test("desktop journal orders the pictured catalog product and clears the previous draft @catalog", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText: async () => { throw new Error("Clipboard denied"); },
    } });
  });
  await page.goto("?audit=order-entry");
  const journal = page.locator("[data-hero-journal]");
  const vendace = journal.locator('[data-hero-journal-product="703"]');
  await expect(vendace).toBeVisible();
  await expect(vendace.locator(".hero-journal-product__toggle")).toHaveText("Заказать по\u00a02\u202f500\u00a0₽/кг");
  for (const link of await vendace.locator("[data-hero-order-telegram], [data-hero-order-whatsapp]").all()) {
    expect(new URL(await link.getAttribute("href")).searchParams.get("text")).toMatch(/Ряпушка\s+холодного\s+копчения[\s\S]*2\s*500\s*₽\/кг/);
  }
  await journal.locator("[data-hero-journal-next]").click();
  const roll = journal.locator('[data-hero-journal-product="702"]');
  await expect(roll).toBeVisible();
  expect(await roll.locator(".hero-journal-product__toggle").textContent()).toBe("Заказать по\u00a03\u202f740\u00a0₽/кг");
  await expect(roll.locator(".hero-journal-product__amount svg")).toBeVisible();
  expect(new URL(await roll.locator('[data-hero-order-telegram]').getAttribute('href')).searchParams.get('text')).toMatch(/Рулет\s+из\s+брюшков\s+осетра[\s\S]*3\s*740\s*₽\/кг/);
  await journal.locator("[data-hero-journal-next]").click();
  const caviar = journal.locator('[data-hero-journal-product="700"]');
  const order = caviar.getByRole("button", { name: /Заказать по.*Икра форели/ });
  await order.press("Enter");
  const choices = caviar.getByRole("group", { name: "Заказать икру форели", exact: true });
  await expect(choices.getByRole("link").first()).toBeFocused();
  for (const link of await choices.locator("[data-hero-order-telegram], [data-hero-order-whatsapp]").all()) {
    const draft = new URL(await link.getAttribute("href")).searchParams.get("text");
    expect(draft).toContain("Икра форели");
    expect(draft).toMatch(/4\s*990\s*₽ за\s*250\s*г/);
  }
  await expect(choices.getByRole("link", { name: "Икра форели в каталоге", exact: true })).toHaveAttribute("href", /product=trout-roe/);
  await choices.getByRole("link").first().click();
  const draft = choices.getByRole("textbox", { name: "Текст для сообщения" });
  await expect(draft).toHaveValue(/Икра форели/);
  await draft.press("ArrowRight");
  await expect(journal.locator("[data-hero-journal-counter]")).toHaveText(/3\s*из\s*5/);
  await page.keyboard.press("Escape");
  await expect(choices).toBeHidden();
  await expect(order).toBeFocused();
  await journal.locator("[data-hero-journal-next]").click();
  const trout = journal.locator('[data-hero-journal-product="699"]');
  await expect(trout).toBeVisible();
  await expect(trout.locator(".hero-journal-product__toggle")).toHaveText("Заказать по\u00a01\u202f680\u00a0₽/кг");
  expect(new URL(await trout.locator('[data-hero-order-telegram]').getAttribute("href")).searchParams.get("text")).toMatch(/Форель\s+охлаждённая[\s\S]*1\s*680\s*₽\/кг/);
  await journal.locator("[data-hero-journal-previous]").click();
  await order.click();
  await expect(draft).toBeHidden();
  await expect(choices.locator("[role=status]")).toBeEmpty();
  await page.keyboard.press("Escape");
  await journal.locator("[data-hero-journal-next]").click();
  await journal.locator("[data-hero-journal-next]").click();
  const herring = journal.locator('[data-hero-journal-product="698"]');
  await herring.getByRole("button", { name: /Заказать по.*Каспийский залом/ }).click();
  const whatsapp = herring.getByRole("link", { name: "В WhatsApp", exact: true });
  const herringDraft = new URL(await whatsapp.getAttribute("href")).searchParams.get("text");
  expect(herringDraft).toContain("Каспийский залом");
  expect(herringDraft).toMatch(/1\s*600\s*₽\/кг/);
  expect(herringDraft).not.toContain("Икра форели");
  await page.route("https://wa.me/**", route => route.fulfill({ contentType: "text/html", body: "Messenger destination" }));
  await whatsapp.click();
  await expect(page).toHaveURL(/^https:\/\/wa\.me\/79166751452\?text=/);
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
  const products = ["Каспийский залом", "Икра форели", "Стейк лосося", "Филе форели холодного копчения без кожи", "Скумбрия горячего копчения"];
  for (const name of products) {
    await expect(page.locator(".afisha__name")).toHaveText(name);
    const price = await page.locator(".afisha__price").textContent();
    for (const [selector, host] of [[".afisha__order-telegram", "t.me"], [".afisha__order-whatsapp", "wa.me"]]) {
      const link = order.locator(selector);
      await expect(link).toBeVisible();
      const url = new URL(await link.getAttribute("href"));
      expect(url.hostname).toBe(host);
      expect(url.searchParams.get("text").replace(/\s+/gu, " ")).toContain(name);
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
    // Scope this check to the shopping entry; delivery has its own reflow test.
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
    // Quotes for withdrawn products stay in source data; current packages keep
    // the applicable guidance without restoring products with blank prices.
    await expect(page.locator(".catalog-product-advice blockquote")).toHaveCount(32);
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
