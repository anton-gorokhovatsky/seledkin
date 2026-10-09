import { test } from "@playwright/test";
test("measure whole meal heading words on Linux", async ({ page }, info) => {
  await page.goto("recipes/?audit=diagnostic#seafood-dinner");
  for (const width of [1024, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    const measurements = await page.locator(".meal-collection > header h3").evaluateAll(headings => headings.map(h => {
      const n = h.firstChild, style = getComputedStyle(h);
      return { text: h.textContent, column: h.getBoundingClientRect().width,
        font: style.font, wrap: style.overflowWrap, balance: style.textWrap,
        words: [...n.textContent.matchAll(/[А-Яа-яЁё]+/g)].map(m => {
          const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index+m[0].length);
          return { word: m[0], rects: [...r.getClientRects()].map(x => ({ x:x.x, y:x.y, width:x.width, height:x.height })) };
        }) };
    }));
    console.log("MEAL_METRICS", width, JSON.stringify(measurements));
    await page.locator("#seafood-dinner").scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`${width}.png`) });
  }
});
