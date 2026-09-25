import { test, expect } from "@playwright/test";

async function expectMetroWithStation(locator) {
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
  expect(layout.text).toMatch(/[Мм]етро «Вавиловская» и «Университет»/);
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
  const plain = await context.newPage();
  await plain.goto(page.url());
  await plain.evaluate(() => document.fonts.ready);
  await expectMetroWithStation(plain.locator(".contacts-source__details p").first());
  await expectMetroWithStation(plain.locator(".source-footer__visit p"));
  await context.close();
});
