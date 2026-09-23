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
  await expect(page.locator("[data-catalog-count]")).toHaveText("2 позиции");
  expect(await page.locator("[data-catalog-count]").textContent()).toBe("2\u00a0позиции");
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
        return { size: s.fontSize, weight: s.fontWeight, leading: s.lineHeight, family: s.fontFamily, x: r.x, y: r.y };
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
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    expect(headings[1]).toEqual(headings[0]);
    expect(headings[2]).toEqual(headings[0]);
    expect(headings[0].weight).toBe("400");
  }
});

test("button labels use the same optical centre in every page and open menu", async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["", "catalog/", "about/", "journal/", "404.html"]) {
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
          expect(label.height).toBeGreaterThanOrEqual(44);
          expect(label.clipped).toBe(false);
        }
      }
    }
  }
});
