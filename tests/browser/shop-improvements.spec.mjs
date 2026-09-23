import { test, expect } from "@playwright/test";

test("customer vocabulary finds existing products and preserves precise filters", async ({ page }) => {
  await page.goto("catalog/");
  for (const [query, count] of [["креветки", 5], ["кальмары", 3], ["селедка", 1], ["лосось", 3], ["стейки лосося", 1], ["креветки северные", 1]]) {
    await page.locator("[data-catalog-search]").fill(query);
    await expect(page.locator(".catalog-product:visible")).toHaveCount(count);
    await expect(page.locator("[data-catalog-empty]")).toBeHidden();
    expect(new URL(page.url()).searchParams.get("q")).toBe(query);
  }
  await page.locator("[data-catalog-select]").selectOption("caviar");
  await expect(page.locator("[data-catalog-empty]")).toBeVisible();
});

test("the journal preview leads to its full story and a product-specific inquiry", async ({ page }) => {
  await page.goto("");
  await page.locator('.journal-preview__entry[href="journal/#journal-entry-694"]').click();
  await expect(page).toHaveURL(/journal\/#journal-entry-694$/);
  const entry = page.locator("#journal-entry-694");
  const inquiry = entry.getByRole("link", { name: /Спросить о наличии/ });
  const url = new URL(await inquiry.getAttribute("href"));
  expect(url.searchParams.get("text")).toContain("Ряпушка холодного копчения");
  expect(url.searchParams.get("text")).toContain("https://t.me/kapitanseledkin/694");
  await expect(entry.getByRole("link", { name: "Читать запись в Телеграме" })).toHaveAttribute("href", "https://t.me/kapitanseledkin/694");
  await page.goto("#journal-entry-680");
  await expect(page).toHaveURL(/journal\/#journal-entry-680$/);
  await page.goto("#journal-entry-683");
  await expect(page).toHaveURL(/journal\/#journal-entry-683$/);
  await page.goto("index.html#journal-entry-682");
  await expect(page).toHaveURL(/journal\/#journal-entry-682$/);
  await page.goto("journal/#journal-entry-999");
  await expect(page.locator("h1")).toHaveText("Судовой журнал");
});

test("complete editorial pages and inquiry links work without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${baseURL}journal/`);
  await expect(page.locator(".ship-log-entry")).toHaveCount(15);
  await expect(page.getByRole("link", { name: /Спросить о наличии/ })).toHaveCount(15);
  await page.goto(`${baseURL}about/`);
  await expect(page.locator(".about-overview__chapter")).toHaveCount(3);
  await expect(page.locator(".founder-source")).toBeVisible();
  await context.close();
});

test("journal previews keep whole photographs, aligned desktop reading lines and readable enlarged text", async ({ page }) => {
  for (const [width, enlarged] of [[1440, false], [390, false], [320, true]]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("");
    if (enlarged) await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    await page.evaluate(() => document.fonts.ready);
    const entries = page.locator(".journal-preview__entry");
    await entries.first().scrollIntoViewIfNeeded();
    const rows = await entries.evaluateAll(async nodes => {
      await Promise.all(nodes.map(node => node.querySelector("img").decode()));
      return nodes.map(node => {
        const rect = selector => {
          const r = node.querySelector(selector).getBoundingClientRect();
          return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
        };
        return { image: rect("img"), date: rect("time"), title: rect("h3"), link: rect(".journal-preview__link"), copy: rect(".journal-preview__copy"), fit: getComputedStyle(node.querySelector("img")).objectFit };
      });
    });
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.fit).not.toBe("cover");
      expect(row.copy.width).toBeGreaterThan(150);
      expect(row.title.y).toBeGreaterThanOrEqual(row.date.bottom);
      expect(row.link.y).toBeGreaterThanOrEqual(row.title.bottom);
      expect(row.link.height).toBeGreaterThanOrEqual(44);
      expect(row.title.right).toBeLessThanOrEqual(width);
    }
    if (width === 1440) {
      for (const row of rows) {
        expect(Math.abs(row.date.y - rows[0].date.y)).toBeLessThan(1);
        expect(Math.abs(row.link.y - rows[0].link.y)).toBeLessThan(1);
        expect(row.image.height).toBeGreaterThan(250);
      }
    }
    if (enlarged) for (const row of rows) expect(row.date.y).toBeGreaterThan(row.image.bottom);
    await entries.first().focus();
    await expect(entries.first()).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/journal\/#journal-entry-694$/);
  }
});

test("mobile shopping appears earlier while original photo proportions survive", async ({ page }) => {
  await page.goto("");
  await page.evaluate(() => document.fonts.ready);
  // The full journal now occupies its own second mobile screen.
  const restOfHome = await page.evaluate(() => document.documentElement.scrollHeight - document.querySelector(".source-hero__journal").getBoundingClientRect().height);
  expect(restOfHome).toBeLessThan(10000);
  await page.goto("catalog/");
  await page.evaluate(() => document.fonts.ready);
  expect((await page.locator(".catalog-product").first().boundingBox()).y).toBeLessThan(650);
  for (const path of ["", "about/", "journal/"]) {
    await page.goto(path);
    const failures = await page.locator("img[data-source-image]").evaluateAll(images => images.filter(image => {
      const style = getComputedStyle(image);
      return style.objectFit === "cover" || style.filter !== "none";
    }).map(image => image.dataset.sourceImage));
    expect(failures).toEqual([]);
  }
});

test("the sea can be paused, stops offscreen, and respects the saved choice across watches", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "no-preference" });
  await context.addInitScript(() => localStorage.setItem("seledkin-theme", "light"));
  const page = await context.newPage();
  await page.goto(baseURL);
  const hero = page.locator("[data-hero-video]");
  await expect.poll(() => hero.evaluate(video => !video.paused && video.currentTime > 0), { timeout: 15000 }).toBe(true);
  await page.locator("#delivery").scrollIntoViewIfNeeded();
  await expect(hero).toHaveJSProperty("paused", true);
  await page.locator("[data-menu-toggle]").click();
  const menuVideo = page.locator("[data-menu-sea-video]");
  await expect.poll(() => menuVideo.evaluate(video => !video.paused && video.currentTime > 0), { timeout: 15000 }).toBe(true);
  const pause = page.locator("[data-menu] [data-sea-toggle]");
  await pause.click();
  await expect(hero).toHaveJSProperty("paused", true);
  await expect(menuVideo).toHaveJSProperty("paused", true);
  await expect(pause).toHaveText("Включить море");
  await page.locator("[data-menu] [data-theme-toggle]").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(menuVideo.locator("source")).toHaveAttribute("src", /hero-sea-night-web\.mp4$/);
  await expect(menuVideo).toHaveJSProperty("paused", true);
  await page.keyboard.press("Escape");
  await page.goto(`${baseURL}journal/`);
  await page.locator("[data-menu-toggle]").click();
  await expect(page.locator("[data-menu] [data-sea-toggle]")).toHaveText("Включить море");
  expect(await page.locator("[data-menu-sea-video] source").getAttribute("src")).toBeNull();
  await page.locator("[data-menu] [data-sea-toggle]").click();
  await expect.poll(() => page.locator("[data-menu-sea-video]").evaluate(video => !video.paused), { timeout: 15000 }).toBe(true);
  await context.close();
});

test("reduced motion downloads no sea video and the journal loads full images on demand", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const requests = [];
  page.on("request", request => requests.push(request.url()));
  await page.goto("");
  await page.evaluate(() => document.fonts.ready);
  expect(requests.filter(url => /\.mp4(?:$|\?)/.test(url))).toEqual([]);
  await expect(page.locator(".source-hero > [data-sea-toggle]")).toBeHidden();
  const pending = page.locator("[data-hero-journal-card] img[data-full-src]");
  await expect(pending).toHaveCount(4);
  for (let index = 2; index <= 5; index++) {
    await page.locator("[data-hero-journal-next]").click();
    const activeImage = page.locator('[data-hero-journal-card][data-stack-position="0"] img');
    await expect.poll(() => activeImage.evaluate(image => image.complete && image.naturalWidth > 32)).toBe(true);
    expect(await activeImage.getAttribute("data-full-src")).toBeNull();
  }
  await expect(page.locator("[data-hero-journal-all]")).toHaveAttribute("href", "journal/");
});


test("a delayed brand image does not block the prioritized poster and sea", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "no-preference" });
  const page = await context.newPage();
  let releaseLogo;
  const logoGate = new Promise(resolve => { releaseLogo = resolve; });
  await page.route("**/logo-redrawn-sea.svg", async route => {
    await logoGate;
    await route.continue();
  });
  try {
    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    await expect.poll(() => page.locator("[data-hero-video]").evaluate(video => !video.paused && video.currentTime > 0), { timeout: 15000 }).toBe(true);
    expect(await page.locator(".source-hero__mobile-logo").evaluate(image => image.complete)).toBe(false);
  } finally {
    releaseLogo();
    await page.waitForLoadState("load");
    await context.close();
  }
});
