import { test, expect } from '@playwright/test';

test('action labels stay vertically centred and editorial harpoons stay beside their text @editorial-links', async ({ page }, testInfo) => {
  const evidence = [];
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ['', 'catalog/', 'about/', 'recipes/', 'journal/', 'recipes/692/', '404.html']) {
      await page.goto(`${route}?audit=action-centering`);
      await page.evaluate(() => document.fonts.ready);
      const targets = page.locator('.source-hero__actions > .source-hero__journal-link:visible, .editorial-link:visible, .recipe-card__read:visible, .recipe-jump a:visible, .afisha__actions > a:visible, .founder-source__source-link:visible');
      const readings = await targets.evaluateAll(nodes => nodes.map(el => {
        const css = getComputedStyle(el), box = el.getBoundingClientRect();
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const boxes = [];
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (!node.textContent.trim() || node.parentElement.closest('svg, [hidden], .visually-hidden')) continue;
          const range = document.createRange(); range.selectNodeContents(node);
          boxes.push(...range.getClientRects());
        }
        const top = Math.min(...boxes.map(b => b.top)), bottom = Math.max(...boxes.map(b => b.bottom));
        const firstLine = boxes.filter(b => Math.abs(b.top - top) < 2);
        const singleLine = boxes.every(b => Math.abs(b.top - top) < 2);
        const arrow = el.matches('.editorial-link') && el.querySelector('svg[viewBox="0 0 32 18"]');
        return { label: el.textContent.trim().replace(/\s+/g, ' '), height: box.height,
          offset: (top + bottom) / 2 - (box.top + box.bottom) / 2,
          clipped: top < box.top - 1 || bottom > box.bottom + 1,
          lineHeight: parseFloat(css.lineHeight),
          arrowGap: arrow && singleLine ? arrow.getBoundingClientRect().left - Math.max(...firstLine.map(b => b.right)) : null,
          intendedGap: parseFloat(css.columnGap) };
      }));
      for (const reading of readings) {
        expect(reading.height, `${width} ${route} ${reading.label}`).toBeGreaterThanOrEqual(44);
        // Text range boxes include the font's ascenders and descenders. Allow
        // their optical asymmetry, but not the former 10px top-pinned line.
        expect(Math.abs(reading.offset), `${width} ${route} ${reading.label}`).toBeLessThan(4);
        expect(reading.clipped, `${width} ${route} ${reading.label}`).toBe(false);
        if (reading.arrowGap != null) {
          expect(reading.arrowGap, `${width} ${route} ${reading.label}`).toBeGreaterThanOrEqual(0);
          expect(reading.arrowGap, `${width} ${route} ${reading.label}`).toBeLessThanOrEqual(reading.intendedGap + 4);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${width} ${route}`).toBeLessThanOrEqual(1);
      if (!route && width >= 1024) {
        const centres = await page.locator('.source-hero__actions > a > span').evaluateAll(spans => spans.map(span => {const r=span.getBoundingClientRect(); return (r.top+r.bottom)/2;}));
        expect(Math.abs(centres[0] - centres[1])).toBeLessThan(2);
      }
      evidence.push({width, route, readings});
    }
  }
  await testInfo.attach('action-centering', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});
