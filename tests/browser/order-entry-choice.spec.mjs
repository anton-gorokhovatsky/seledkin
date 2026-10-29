import { test, expect } from "@playwright/test";
import { catalog } from "../../assets/catalog-data.js";
import { catalogPrice } from "../../assets/catalog-model.js";
import { homeJournalEntries as currentJournal, mobileHomeEntries, resolveHomeProduct } from "../../scripts/site-content.mjs";
const currentProducts = mobileHomeEntries.map(entry => resolveHomeProduct(entry).product);

test("desktop journal orders the pictured catalog product and clears the previous draft @catalog @hero-journal", async ({ page })=>{
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText: async () => { throw new Error("Clipboard denied"); },
    } });
  });
  await page.goto("?audit=order-entry");
  const journal = page.locator("[data-hero-journal]");
  const plain = text => text.replace(/\s+/gu, " ").trim();
  for (const [index, entry] of currentJournal.entries()) {
    if (index) await journal.locator("[data-hero-journal-next]").click();
    const group = journal.locator(`[data-hero-journal-product="${entry.id}"]`);
    const product = catalog.flatMap(category => category.items).find(product => product.id === entry.catalogProductIds[0]);
    await expect(group).toBeVisible();
    const order = group.locator(".hero-journal-product__toggle");
    await expect(order).toHaveText(`Заказать по ${catalogPrice(product.price)}`);
    await expect(group.locator(".hero-journal-product__amount svg")).toBeVisible();
    let expectedWhatsApp;
    for (const link of await group.locator("[data-hero-order-telegram], [data-hero-order-whatsapp]").all()) {
      const url = new URL(await link.getAttribute("href"));
      const draft = url.searchParams.get("text");
      if (url.hostname === "wa.me") expectedWhatsApp = draft;
      expect(plain(draft)).toContain(plain(product.name));
      expect(plain(draft)).toContain(plain(catalogPrice(product.price)));
    }
    if (index === 1) {
      await order.press("Enter");
      const choices = group.getByRole("group", { name: `Заказать ${entry.heroOrderName}`, exact: true });
      await expect(choices.getByRole("link", { name: `${product.name} в каталоге`, exact: true })).toHaveAttribute("href", new RegExp(`product=${product.id}`));
      await expect(choices.getByRole("link").first()).toBeFocused();
      await choices.getByRole("link").first().click();
      const draft = choices.getByRole("textbox", { name: "Текст для сообщения" });
      expect(plain(await draft.inputValue())).toContain(plain(product.name));
      await draft.press("ArrowRight");
      await expect(journal.locator("[data-hero-journal-counter]")).toHaveText(`${index + 1} из ${currentJournal.length}`);
      await page.keyboard.press("Escape");
      await expect(choices).toBeHidden();
      await expect(order).toBeFocused();
      await journal.locator("[data-hero-journal-next]").click();
      await journal.locator("[data-hero-journal-previous]").click();
      await order.click();
      await expect(draft).toBeHidden();
      await expect(choices.locator("[role=status]")).toBeEmpty();
      await page.keyboard.press("Escape");
    }
    if (index === currentJournal.length - 1) {
      await order.click();
      const whatsapp = group.getByRole("link", { name: "В WhatsApp", exact: true });
      await page.route("https://wa.me/**", route => route.fulfill({ body: "Messenger handoff" }));
      await whatsapp.click();
      await expect(page).toHaveURL(/^https:\/\/wa\.me\/79166751452\?text=/);
      const actualDraft = new URL(page.url()).searchParams.get("text");
      expect(actualDraft).toBe(expectedWhatsApp);
      expect(plain(actualDraft)).toContain(plain(product.name));
      expect(plain(actualDraft)).toContain(plain(catalogPrice(product.price)));
      const previous = catalog.flatMap(category => category.items).find(product => product.id === currentJournal[index - 1].catalogProductIds[0]);
      if (!product.name.includes(previous.name)) expect(plain(actualDraft)).not.toContain(plain(previous.name));
    }
  }
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
  const products = currentProducts.map(product => product.name);
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
  expect(new URL(page.url()).searchParams.get("text")).toContain(products[2]);

  const fallback = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const plain = await fallback.newPage();
  await plain.goto(new URL("?audit=order-entry", baseURL).href);
  await plain.locator(".afisha__order summary").click();
  for (const link of await plain.locator(".afisha__order a").all()) {
    await expect(link).toBeVisible();
    expect(new URL(await link.getAttribute("href")).searchParams.get("text")).toContain(products[0]);
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
  await expect(page.getByRole("textbox", { name: "Текст для сообщения" })).toHaveValue(new RegExp(currentProducts[0].name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/gu, "\\s+")));
  await expect(page.locator(".afisha__order-status")).toContainText("Автоматическое копирование недоступно");
  await page.locator(".afisha__change").click();
  await expect(page.getByRole("textbox", { name: "Текст для сообщения" })).toBeHidden();
  await expect(page.locator(".afisha__order-status")).toBeEmpty();
  await page.evaluate(() => { window.refuseOrderCopy = false; });
  await page.route("https://t.me/**", route => route.fulfill({ contentType: "text/html", body: "Messenger destination" }));
  await page.locator(".afisha__order-telegram").click();
  await expect(page).toHaveURL(/^https:\/\/t\.me\/\+79166751452\?text=/);
  expect(copied).toHaveLength(1);
  const plain = text => text.replace(/\s+/gu, " ");
  expect(plain(copied[0])).toContain(plain(currentProducts[1].name));
  if (!currentProducts[1].name.includes(currentProducts[0].name)) expect(plain(copied[0])).not.toContain(plain(currentProducts[0].name));
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
