import { test, expect } from "@playwright/test";

test("typography crosses inline links without changing links, code or user input", async ({ page }) => {
  await page.goto("404.html");
  const result = await page.evaluate(async () => {
    const { typographDocument } = await import("/assets/typography.js?v=typography-23-1");
    const root = document.createElement("section");
    root.innerHTML = `<p>Спросить в <a href="https://ks.fish/catalog/?q=0%25"> Телеграме</a>.</p>
      <p>Доставка — <strong>490 ₽</strong></p><p>Отдельное в</p><p>другом абзаце</p>
      <pre>1000 ₽ и код</pre><p contenteditable>в тексте 1000 ₽</p><textarea>в тексте 1000 ₽</textarea>
      <input value="в тексте 1000 ₽" placeholder="Найти в каталоге">
      <a href="https://ks.fish/?q=0%25">https://ks.fish/?q=0%25</a>`;
    document.body.append(root);
    const link = root.querySelector("a");
    typographDocument(root);
    const once = root.innerHTML;
    typographDocument(root);
    return {
      paragraphs: [...root.querySelectorAll("p")].map(el => el.textContent),
      linkPreserved: link === root.querySelector("a"), href: link.href,
      code: root.querySelector("pre").textContent,
      textarea: root.querySelector("textarea").value, input: root.querySelector("input").value,
      placeholder: root.querySelector("input").placeholder,
      url: root.querySelector(":scope > a:last-child").textContent, stable: once === root.innerHTML,
    };
  });
  expect(result.paragraphs).toEqual(["Спросить в\u00a0Телеграме.", "Доставка\u00a0— 490\u00a0₽", "Отдельное в", "другом абзаце", "в тексте 1000 ₽"]);
  expect(result.linkPreserved).toBe(true);
  expect(result.href).toBe("https://ks.fish/catalog/?q=0%25");
  expect(result.code).toBe("1000 ₽ и код");
  expect(result.textarea).toBe("в тексте 1000 ₽");
  expect(result.input).toBe("в тексте 1000 ₽");
  expect(result.placeholder).toBe("Найти в\u00a0каталоге");
  expect(result.url).toBe("https://ks.fish/?q=0%25");
  expect(result.stable).toBe(true);
});

test("updated search and journal counters keep their number and noun together", async ({ page }) => {
  await page.goto("catalog/");
  await page.locator("[data-catalog-search]").fill("нерка");
  await expect(page.locator("[data-catalog-count]")).toHaveText("3 позиции");
  expect(await page.locator("[data-catalog-count]").textContent()).toBe("3\u00a0позиции");
  await page.locator("[data-catalog-search]").fill("эталонная");
  await expect(page.locator("[data-catalog-count]")).toHaveText("В каталоге нет совпадений · Из журнала: 1");
  expect(await page.locator("[data-catalog-count]").textContent()).toContain("Из\u00a0журнала: 1");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("");
  await page.locator("[data-hero-journal-next]").click();
  expect(await page.locator("[data-hero-journal-counter]").textContent()).toBe("2\u00a0из\u00a05");
});

test("internal sections and the three reasons retain their shared heading levels", async ({ page }) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const headings = [];
    for (const route of ["catalog/", "about/", "journal/"]) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      headings.push(await page.locator("main h1").evaluate(el => {
        const s = getComputedStyle(el), r = el.getBoundingClientRect();
        // The shared type scale and left edge stay equal. A page's title can
        // move vertically to align with its own final caption or action line.
        return { size: s.fontSize, weight: s.fontWeight, leading: s.lineHeight, family: s.fontFamily, x: r.x };
      }));
      if (route === "about/") {
        for (const selector of [".about-overview__reason h3", ".about-overview__number"]) {
          const levels = await page.locator(selector).evaluateAll(elements => elements.map(el => {
            const s = getComputedStyle(el);
            return [s.fontSize, s.lineHeight, s.fontWeight, s.fontFamily, s.fontStyle];
          }));
          expect(levels).toHaveLength(3);
          expect(levels[1]).toEqual(levels[0]);
          expect(levels[2]).toEqual(levels[0]);
        }
      }
      if (route === "catalog/") await expect(page.locator('.catalog-order h2')).toHaveCSS('font-weight', '400');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    expect(headings[1]).toEqual(headings[0]);
    expect(headings[2]).toEqual(headings[0]);
    expect(headings[0].weight).toBe("400");
    await page.goto('404.html');
    await expect(page.locator('h1')).toHaveCSS('font-weight', '400');
    await expect(page.locator('h1')).toHaveCSS('font-size', headings[0].size);
    await page.goto('');
    await expect(page.locator('#contacts h2')).toHaveCSS('font-weight', '400');
  }
});

// A zero-height inline probe measures the actual text baseline. Wrapping the
// final text node preserves the anonymous flex item used by editorial links.
async function textBaseline(locator, firstLine = false) {
  return locator.evaluate((el, firstLine) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let text, node;
    while ((node = walker.nextNode())) if (node.textContent.trim()) {
      text = node;
      if (firstLine) break;
    }
    if (!text) throw new Error("No visible text for baseline measurement");
    const wrapper = document.createElement("span");
    const probe = document.createElement("span");
    probe.style.cssText = "display:inline-block;width:0;height:0;padding:0;margin:0;border:0;vertical-align:baseline";
    text.replaceWith(wrapper);
    // A probe after the source's trailing newline can create an empty last
    // line in WebKit. Measure after the final visible character instead.
    if (firstLine) wrapper.append(probe, document.createTextNode(text.textContent.trimStart()));
    else wrapper.append(document.createTextNode(text.textContent.trimEnd()), probe);
    const baseline = probe.getBoundingClientRect().top;
    wrapper.replaceWith(text);
    return baseline;
  }, firstLine);
}

test("the harpoon shaft meets the capital-letter centre on the first text line @typography", async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [route, selectors] of [
      ["", [".watch-catch__header > a", ".watch-catch__caption"]],
      ["recipes/", [".recipe-editorial-product__link"]],
    ]) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      for (const selector of selectors) {
        const link = page.locator(selector).first();
        await link.scrollIntoViewIfNeeded();
        const baseline = await textBaseline(link, true);
        const ink = await link.evaluate(el => {
          const css = getComputedStyle(el), context = document.createElement("canvas").getContext("2d");
          context.font = `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
          const cap = context.measureText("I").actualBoundingBoxAscent;
          const box = el.querySelector('svg[viewBox="0 0 32 18"]').getBoundingClientRect();
          return { cap, shaft: box.top + box.height / 2 };
        });
        expect(Math.abs(ink.shaft - baseline + ink.cap / 2), `${width}px ${selector}`).toBeLessThan(0.75);
      }
    }
  }
});

test("entry captions and actions meet the title's final text line @recipes @journal", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [route, heading, companion] of [
    ["recipes/?audit=alignment", ".recipes-intro h1", ".recipes-intro__copy p"],
    ["journal/?audit=alignment", ".journal-atlas__header h1", ".journal-atlas__introduction .editorial-link"],
  ]) {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    const titleLine = await textBaseline(page.locator(heading));
    const companionLine = await textBaseline(page.locator(companion));
    expect(Math.abs(titleLine - companionLine), route).toBeLessThan(1);
  }
});

test("section headings retain their text line and footer channels follow their paragraph @footer", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("?audit=alignment");
  await page.evaluate(() => document.fonts.ready);
  const offsets = [];
  for (const [heading, companion] of [
    [".assortment-overview__header h2", ".assortment-overview__header p"],
    [".watch-catch__header h2", ".watch-catch__header a"],
    [".journal-preview__header h2", ".journal-preview__header a"],
    [".contacts-source__card h2", ".contacts-source__details .store-status"],
  ]) {
    const titleLine = await textBaseline(page.locator(heading));
    const companionLine = await textBaseline(page.locator(companion));
    offsets.push({ heading, offset: Math.abs(titleLine - companionLine) });
  }
  expect(offsets.filter(({ offset }) => offset >= 1), JSON.stringify(offsets)).toEqual([]);
  // The accepted footer places subscription links below the paragraph.
  // Preserve their left axis and the interval within this semantic group.
  const subscription = await page.locator(".source-footer__postscript > p").boundingBox();
  const channels = await page.locator(".source-footer__channels").boundingBox();
  expect(Math.abs(channels.x - subscription.x)).toBeLessThan(1);
  const subscriptionGap = channels.y - subscription.y - subscription.height;
  expect(subscriptionGap).toBeGreaterThanOrEqual(16);
  expect(subscriptionGap).toBeLessThanOrEqual(32);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [route, container, children] of [
      ["catalog/?audit=alignment", ".catalog-category-header", "h3, p"],
      ["?audit=alignment", ".journal-preview__header", ":scope > div, :scope > a"],
    ]) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      const edges = await page.locator(container).first().evaluate((el, selectors) => ({
        left: el.getBoundingClientRect().left,
        children: Array.from(el.querySelectorAll(selectors)).map(child => child.getBoundingClientRect().left),
      }), children);
      for (const left of edges.children) expect(Math.abs(left - edges.left), `${width}px ${container}`).toBeLessThan(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  }
});

test("button labels use the same optical centre in every page and open menu", async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["", "catalog/", "about/", "journal/", "journal/698/", "journal/683/", "404.html"]) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      for (const menu of [false, true]) {
        if (menu && route === "404.html") continue;
        if (menu) await page.locator("[data-menu-toggle]").click();
        const labels = await page.locator(".source-button:visible, .theme-toggle:visible").evaluateAll(elements => elements.map(el => {
          const label = el.querySelector(".source-button__label,[data-theme-label]");
          if (!label) return { missing: el.textContent.trim() };
          const r = el.getBoundingClientRect(), l = label.getBoundingClientRect();
          const offset = new DOMMatrix(getComputedStyle(label).transform).m42;
          return { missing: false, centreError: Math.abs(l.y + l.height / 2 - r.y - r.height / 2 - offset), offset, height: r.height, clipped: l.bottom > r.bottom || l.top < r.top };
        }));
        expect(labels.length).toBeGreaterThan(0);
        for (const label of labels) {
          expect(label.missing).toBe(false);
          expect(label.centreError).toBeLessThan(0.7);
          expect(label.offset).toBeGreaterThan(0);
          // WebKit can report 43.999969 for a 44px box at a long-page offset.
          // Normalise floating-point coordinates, not the hit-area requirement.
          expect(Math.round(label.height * 1000) / 1000).toBeGreaterThanOrEqual(44);
          expect(label.clipped).toBe(false);
        }
      }
    }
  }
});
