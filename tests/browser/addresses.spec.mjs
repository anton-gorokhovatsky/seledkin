import { test, expect } from "@playwright/test";

async function expectMetroWithStation(locator, additionalStation = true) {
  const layout = await locator.evaluate(element => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const start = node.textContent.toLowerCase().indexOf("метро");
      if (start < 0) continue;
      const glyph = offset => {
        const range = document.createRange();
        range.setStart(node, start + offset);
        range.setEnd(node, start + offset + 1);
        return range.getBoundingClientRect().top;
      };
      return {
        text: element.textContent.replace(/\u00ad/g, "").replace(/\s+/g, " "),
        metroLine: glyph(4),
        stationLine: glyph(7),
        width: element.clientWidth,
        contentWidth: element.scrollWidth,
      };
    }
    return null;
  });
  expect(layout).not.toBeNull();
  expect(layout.text).toMatch(/[Мм]етро «Вавиловская»/);
  if (additionalStation) expect(layout.text).toContain('«Вавиловская» и «Университет»');
  expect(Math.abs(layout.metroLine - layout.stationLine)).toBeLessThan(1);
  expect(layout.contentWidth).toBeLessThanOrEqual(layout.width);
}

test("metro stays with the station at narrow widths and enlarged text", async ({ page, browser }) => {
  for (const [width, mode] of [[1440, "normal"], [980, "normal"], [390, "normal"], [320, "normal"], [320, "text"], [320, "spacing"]]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("");
    if (mode === "text") await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    if (mode === "spacing") await page.addStyleTag({ content: "* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; }" });
    await page.evaluate(() => document.fonts.ready);
    await expectMetroWithStation(page.locator(".contacts-source__details p").first());
    await expectMetroWithStation(page.locator(".source-footer__visit p"));
    await page.locator("[data-menu-toggle]").click();
    await expectMetroWithStation(page.locator(".site-menu__service address"));
  }
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  await context.route("https://mc.yandex.ru/**", route => route.abort());
  const plain = await context.newPage();
  await plain.goto(page.url());
  await plain.evaluate(() => document.fonts.ready);
  await expectMetroWithStation(plain.locator(".contacts-source__details p").first());
  await expectMetroWithStation(plain.locator(".source-footer__visit p"));
  await context.close();
});

test("editorial introductions keep metro with its station, including without JavaScript", async ({ browser, baseURL }) => {
  for (const javaScriptEnabled of [true, false]) {
    const context = await browser.newContext({ javaScriptEnabled, viewport: { width: 390, height: 900 } });
    await context.route("https://mc.yandex.ru/**", route => route.abort());
    const page = await context.newPage();
    for (const [route, selector] of [["", ".about-preview__copy p"], ["about/", ".about-overview__introduction p"]]) {
      await page.goto(new URL(route, baseURL).href);
      const introduction = page.locator(selector).filter({ hasText: "небольшой магазин" });
      for (const [width, mode] of [[390, "normal"], [320, "normal"], [320, "text"], [320, "spacing"]]) {
        await page.setViewportSize({ width, height: 900 });
        // addStyleTag waits for a style load event that does not fire with JS disabled.
        await page.evaluate(mode => {
          document.querySelector("#metro-test-spacing")?.remove();
          const style = document.createElement("style");
          style.id = "metro-test-spacing";
          style.textContent = mode === "text" ? "html { font-size: 200% !important; }"
            : mode === "spacing" ? "* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; }" : "";
          document.head.append(style);
        }, mode);
        await introduction.scrollIntoViewIfNeeded();
        await page.evaluate(() => document.fonts.ready);
        await expectMetroWithStation(introduction, false);
      }
    }
    await context.close();
  }
});
