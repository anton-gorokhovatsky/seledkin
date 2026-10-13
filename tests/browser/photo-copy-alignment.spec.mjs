import { test, expect } from "@playwright/test";

// A visitor should encounter the same photo/text edge in large stories,
// short rows, filtered results and the shared footer.
const compositions = [
  ["", [
    [".recipe-feature", "img", ".recipe-meta"],
    [".watch-catch__item", "img", ".watch-catch__name"],
    [".delivery-waybill", "img", ".delivery-waybill__eyebrow"],
    [".about-preview__layout", "img", ".about-preview__copy > :first-child"],
    [".journal-preview__entry", "img", "time"],
    [".source-footer__content", "img", ".source-footer__kicker"],
  ]],
  ["about/", [
    [".about-overview > .source-shell", "img", ".about-overview__heading > :first-child"],
    [".founder-source__inner", "img", ".founder-source__copy > :first-child"],
    [".about-overview__chapter", "img", ".about-overview__number"],
    [".founder-source__closing", "img", ".founder-source__principle"],
  ]],
  ["recipes/", [
    [".recipe-editorial-lead", "img", ".recipe-meta"],
    [".recipe-record:visible", "img", ".recipe-record-meta"],
  ]],
  ["recipes/?ingredient=pasta", [[".recipe-editorial-story:visible", "img", ".recipe-meta"]]],
  ["recipes/701/", [[".journal-story", ":scope > img", ".ship-log-entry__content > :first-child"]]],
  ["journal/", [[".journal-index-entry", "img", "time"]]],
];

for (const [width, enlarged] of [[1440, false], [980, false], [390, false], [320, true]]) {
  test(`photo and copy share their top edge at ${width}px${enlarged ? " with enlarged text" : ""}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const [route, families] of compositions) {
      await page.goto(route);
      if (enlarged) await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
      await page.evaluate(() => document.fonts.ready);
      for (const [family, photoSelector, textSelector] of families) {
        // Lazy photos must have their final dimensions before comparing columns.
        for (const photo of await page.locator(family).locator(photoSelector).all()) {
          await photo.scrollIntoViewIfNeeded();
          await photo.evaluate(image => image.decode());
        }
        const rows = await page.locator(family).evaluateAll((nodes, selectors) => nodes.map(node => {
          const photo = node.querySelector(selectors[0]).getBoundingClientRect();
          const copy = node.querySelector(selectors[1]).getBoundingClientRect();
          return { photo: photo.toJSON(), copy: copy.toJSON() };
        }), [photoSelector, textSelector]);
        expect(rows.length, `${route} ${family}`).toBeGreaterThan(0);
        for (const { photo, copy } of rows) {
          const sideBySide = copy.left >= photo.right - 1 || photo.left >= copy.right - 1;
          if (sideBySide) expect(Math.abs(photo.top - copy.top), `${route} ${family}`).toBeLessThan(1);
          else expect(copy.top >= photo.bottom - 1 || photo.top >= copy.bottom - 1, `${route} ${family} stacks without overlap`).toBe(true);
        }
      }
      const overflow = await page.evaluate(() => {
        const elements = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode, range = document.createRange();
          if (!node.textContent.trim() || node.parentElement.closest("[hidden],.visually-hidden,script,style")) continue;
          range.selectNodeContents(node);
          const right = Math.max(...[...range.getClientRects()].map(rect => rect.right));
          if (right > innerWidth + 1) elements.push({ text: node.textContent.trim().slice(0, 70), className: node.parentElement.className, right });
        }
        return { width: document.documentElement.scrollWidth - innerWidth, elements: elements.slice(0, 8) };
      });
      expect(overflow.width, `${route}: ${JSON.stringify(overflow.elements)}`).toBeLessThanOrEqual(1);
    }
  });
}
