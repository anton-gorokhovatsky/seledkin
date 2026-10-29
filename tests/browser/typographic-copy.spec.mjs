import { test, expect } from "@playwright/test";

const pages = JSON.parse(process.env.TYPOGRAPHY_PAGES || "[]");

function wordBreaks(element, word) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const match = [...node.textContent.matchAll(/[\p{L}\u00ad]+/gu)].find(value => value[0].replaceAll("\u00ad", "") === word);
    if (!match) continue;
    const letters = [...match[0].matchAll(/\p{L}/gu)].map(letter => {
      const range = document.createRange();
      range.setStart(node, match.index + letter.index);
      range.setEnd(node, match.index + letter.index + 1);
      return [...range.getClientRects()].filter(rect => rect.width > 0).at(-1);
    });
    return letters.flatMap((rect, index) => index && rect.y > letters[index - 1].y + 5 ? [index] : []);
  }
  throw new Error(`Visible word not found: ${word}`);
}

test("reviewed preview words avoid the awkward short endings at their real measures @typography", async ({ browser, baseURL }, testInfo) => {
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
    await context.addInitScript(value => localStorage.setItem("seledkin-theme", value), theme);
    await context.route(/mc\.yandex|api\.mapbox/, route => route.abort());
    const page = await context.newPage();
    await page.goto(`${baseURL}?audit=reviewed-heading-breaks`);
    await page.evaluate(() => document.fonts.ready);
    const examples = [["#journal-preview-702", "горячего", 6], [".watch-catch__name", "счастливой", 4]];
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      for (const [selector, word, unwantedBreak] of examples) {
        const label = page.locator(selector).filter({ hasText: new RegExp(word.split("").join("\\u00ad?")) }).first();
        await label.scrollIntoViewIfNeeded();
        const breaks = await label.evaluate(wordBreaks, word);
        expect(breaks, `${theme} ${width}px ${word}`).not.toContain(unwantedBreak);
        if (theme === "light" && ((word === "горячего" && width === 390) || (word === "счастливой" && width === 1440))) {
          await page.screenshot({ path: testInfo.outputPath(`reviewed-${width}-${word}.png`) });
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
    for (const [route, word] of [["journal/702/", "горячего"], ["recipes/627/", "счастливой"]]) {
      await page.goto(`${baseURL}${route}?audit=reviewed-heading-stress`);
      await page.addStyleTag({ content: `html { font-size:200% !important; }
        * { line-height:1.5 !important; letter-spacing:.12em !important; word-spacing:.16em !important; }
        p { margin-bottom:2em !important; }` });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const breaks = await page.locator("h1").evaluate(wordBreaks, word);
      const boundaries = [0, ...breaks, word.length];
      const fragments = boundaries.slice(1).map((end, index) => word.slice(boundaries[index], end));
      expect(fragments.every(fragment => fragment.length > 1), `${theme} 320px text200 spacing: ${fragments.join(" / ")}`).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: testInfo.outputPath(`reviewed-320-stress-${theme}-${word}.png`) });
    }
    await context.close();
  }
});

test("changed typographic copy preserves narrow reflow and enlarged text @typography", async ({ browser, baseURL }) => {
  test.skip(!pages.length, "Only used for a verified typographic-only release");
  test.setTimeout(90000);
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    await context.route("https://mc.yandex.ru/**", route => route.abort());
    await context.addInitScript(value => localStorage.setItem("seledkin-theme", value), theme);
    const page = await context.newPage();
    for (const path of pages) {
      await page.goto(`${baseURL}${path}?audit=typography`);
      await expect(page.locator("main")).toBeVisible();
      for (const width of [1512, 1024, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      }
      await page.addStyleTag({ content: "html { font-size:200% !important; }" });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
    await context.close();
  }
});
