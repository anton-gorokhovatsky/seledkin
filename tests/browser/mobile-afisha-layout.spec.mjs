import { test, expect } from "@playwright/test";

const textSpacing = `html { font-size: 200% !important; }
  * { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; }
  p { margin-bottom: 2em !important; }`;

const rendered = page => page.evaluate(() => new Promise(resolve => {
  requestAnimationFrame(() => requestAnimationFrame(resolve));
}));

const geometry = page => page.locator(".afisha").evaluate(afisha => {
  const box = selector => {
    const element = afisha.querySelector(selector);
    const { x, y, width, height } = element.getBoundingClientRect();
    return { x, y: y + scrollY, width, height };
  };
  const current = afisha.querySelector('.afisha__print[data-position="0"]');
  const image = current.querySelector("img");
  return {
    frame: box(".afisha__frame"), change: box(".afisha__change"), order: box(".afisha__order summary"),
    label: current.dataset.orderLabel, name: current.dataset.caption, price: current.dataset.price,
    fit: getComputedStyle(image).objectFit, overflow: document.documentElement.scrollWidth - innerWidth,
  };
});

async function wholeCycle(page) {
  await page.locator(".afisha__change").scrollIntoViewIfNeeded();
  await rendered(page);
  const first = await geometry(page);
  for (let index = 0; index <= 5; index += 1) {
    const current = await geometry(page);
    for (const role of ["frame", "change", "order"]) {
      for (const axis of ["x", "y", "width", "height"]) {
        expect(Math.abs(current[role][axis] - first[role][axis]), `${role} ${axis}, photo ${index + 1}`).toBeLessThanOrEqual(1);
      }
    }
    expect(current.fit).toBe("contain");
    expect(current.overflow).toBeLessThanOrEqual(1);
    await expect(page.locator(".afisha__name")).toHaveText(current.name);
    await expect(page.locator(".afisha__price")).toHaveText(current.price);
    // The existing disclosure glyph is exposed by some browsers; sizing text must stay absent.
    const label = current.label.split(/\s+/u).map(word => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
    await expect(page.locator(".afisha__order summary")).toHaveAccessibleName(new RegExp(`^${label}(?:\\s+[+−])?$`));
    if (index < 5) await page.locator(".afisha__change").press("Enter");
  }
  await expect(page.locator(".afisha")).toHaveAttribute("data-photo-index", "1");
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("seledkin-theme", "dark"));
  await page.route(/mc\.yandex|api\.mapbox/, route => route.abort());
});

test("afisha captions keep the complete photo and controls still through all products, resizing and enlarged text @afisha", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("?audit=afisha-caption-layout");
  await page.evaluate(() => document.fonts.ready);
  // The same page recalculates the slot when available width and user text settings change.
  for (const width of [390, 360, 430, 320]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    await rendered(page);
    await wholeCycle(page);
  }
  await page.addStyleTag({ content: textSpacing });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    await rendered(page);
    await wholeCycle(page);
    await page.locator(".afisha__order summary").press("Enter");
    await wholeCycle(page);
    await page.locator(".afisha__change").scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`afisha-${width}-enlarged.png`) });
    await page.locator(".afisha__order summary").press("Enter");
  }
});

test("afisha keeps its disclosure sign and counter with their labels without repeating accessible names @afisha", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("?audit=afisha-counter-layout");
  await page.evaluate(() => document.fonts.ready);
  await rendered(page);
  for (const index of [0, 3]) {
    if (index) for (let step = 0; step < index; step += 1) await page.locator(".afisha__change").press("Enter");
    const gap = await page.locator(".afisha__order-label").evaluate(label => {
      const range = document.createRange();
      range.selectNodeContents(label);
      const before = range.getBoundingClientRect();
      const expected = parseFloat(getComputedStyle(label).columnGap);
      // A zero-width probe precedes ::after; its negative trailing margin keeps the original layout.
      const probe = document.createElement("span");
      probe.setAttribute("aria-hidden", "true");
      probe.style.cssText = `flex:none;width:0;height:0;min-width:0;padding:0;border:0;margin:0 ${-expected}px 0 0`;
      label.append(probe);
      const text = range.getBoundingClientRect();
      const actual = probe.getBoundingClientRect().left - text.right;
      probe.remove();
      return { expected, actual, textMoved: Math.abs(text.width - before.width),
        content: getComputedStyle(label, "::after").content,
        detachedContent: getComputedStyle(label.closest("summary"), "::after").content };
    });
    expect(gap.textMoved).toBeLessThanOrEqual(1);
    expect(gap.actual).toBeGreaterThanOrEqual(0);
    expect(Math.abs(gap.actual - gap.expected)).toBeLessThanOrEqual(1);
    expect(gap.content).toBe('"+"');
    expect(gap.detachedContent).toBe("none");
  }
  await page.locator(".afisha__frame").press("ArrowRight");
  await page.locator(".afisha__frame").press("ArrowRight");
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addStyleTag({ content: textSpacing });
  await page.evaluate(() => document.fonts.ready);
  await rendered(page);
  const titleLines = await page.locator(".afisha__title").evaluate(title => {
    const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
    const lines = [];
    while (walker.nextNode()) {
      const range = document.createRange();
      range.selectNodeContents(walker.currentNode);
      for (const rect of range.getClientRects()) if (rect.width) lines.push({ left: rect.left, right: rect.right });
    }
    return { lines, width: innerWidth };
  });
  for (const line of titleLines.lines) {
    expect(line.left).toBeGreaterThanOrEqual(-1);
    expect(line.right).toBeLessThanOrEqual(titleLines.width + 1);
  }
  const change = page.locator(".afisha__change");
  await expect(change).toHaveAccessibleName("Ещё из лавки");
  await expect(page.locator(".afisha__name")).toHaveCount(1);
  await expect(page.locator(".afisha__price")).toHaveCount(1);
  await expect(page.locator(".afisha__order-label")).toHaveCount(1);
  for (const copy of await page.locator(".afisha__caption-size, .afisha__order-label-size").all()) {
    await expect(copy).toHaveAttribute("aria-hidden", "true");
    expect(await copy.evaluate(element => getComputedStyle(element).visibility)).toBe("hidden");
  }
  const position = page.locator(".afisha__change-position");
  const count = await position.locator(".afisha__count").boundingBox();
  const arrow = await position.locator("svg").boundingBox();
  expect(arrow.y).toBeLessThan(count.y + count.height);
  expect(count.y).toBeLessThan(arrow.y + arrow.height);
  expect(arrow.x).toBeGreaterThan(count.x + count.width);
  await change.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("afisha-counter-320-enlarged.png") });
  await change.press("Enter");
  await expect(page.locator(".afisha")).toHaveAttribute("data-photo-index", "2");
});
