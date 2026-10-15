import { test, expect } from "@playwright/test";

test("footer subscription stays with the contacts and the complete portrait @footer", async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("seledkin-theme", "light"));
  for (const theme of ["light", "dark"]) {
    await page.goto("about/?audit=footer-composition");
    if (theme === "dark") {
      await page.locator("[data-menu-toggle]").click();
      await page.getByRole("radio", { name: "Ночная", exact: true }).check();
      await page.locator("[data-menu-close]").click();
    }
    await page.locator("ag-signature[data-signature-version]").waitFor();
    const portrait = page.locator(".source-footer__portrait img");
    for (const width of [1512, 980, 760, 638, 390, 320]) {
      await page.setViewportSize({width, height:900});
      if (width === 320) await page.addStyleTag({content:"html { font-size:200% !important; }"});
      // A viewport change may select another srcset image, especially over the network.
      await portrait.scrollIntoViewIfNeeded();
      await portrait.evaluate(img => img.decode());
      const details = await page.locator(".source-footer__details").boundingBox();
      const subscription = await page.locator(".source-footer__postscript").boundingBox();
      const photo = await portrait.boundingBox();
      const ratio = await portrait.evaluate(img => img.naturalWidth / img.naturalHeight);
      expect(photo.width / photo.height).toBeCloseTo(ratio, 2);
      if (width > 736) {
        expect(Math.abs(subscription.x - details.x)).toBeLessThan(1);
        expect(subscription.y - details.y - details.height).toBeGreaterThanOrEqual(0);
        expect(subscription.y - details.y - details.height).toBeLessThanOrEqual(64);
        expect(Math.abs(photo.y - details.y)).toBeLessThan(1);
      } else {
        const caption = await page.locator(".source-footer__portrait").boundingBox();
        expect(subscription.y).toBeGreaterThanOrEqual(caption.y + caption.height);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      if (width === 1512) await page.locator(".source-footer").screenshot({path:testInfo.outputPath(`footer-composition-${width}-${theme}.png`)});
      await page.locator(".source-footer__base").scrollIntoViewIfNeeded();
      if (width === 390) await page.screenshot({path:testInfo.outputPath(`footer-composition-${width}-${theme}.png`)});
    }
  }
});

test("every shared footer shows Coral without the old shoal, including nested journal entries @footer", async ({ page }) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const videos = [];
  page.on("request", request => { if (/footer-coral(?:-organic)?\.mp4/.test(request.url())) videos.push(request.url()); });
  for (const path of ["", "about/", "catalog/", "recipes/", "journal/", "journal/700/"]) {
    for (const width of [1512, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${path}?audit=shared-footer-coral`);
      const footer = page.locator(".source-footer");
      await page.locator(".source-footer__base").scrollIntoViewIfNeeded();
      await expect(footer).toHaveAttribute("data-coral", "");
      expect(await footer.evaluate(f => getComputedStyle(f, "::before").display), `${path} old shoal`).toBe("none");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${path} at ${width}px`).toBe(0);
      await expect(footer.locator('a[href="https://t.me/+79166751452"]')).toBeVisible();
      await expect(footer.locator('a[href="https://wa.me/79166751452"]')).toBeVisible();
    }
  }
  expect(videos).toEqual([]);
});

test("footer Coral loads on approach, shares the sea pause and stops offscreen", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const requests = [];
  page.on("request", request => {
    if (/footer-coral(?:(?:-organic)?\.mp4|-poster\.webp)/.test(request.url())) requests.push(request.url());
  });
  await page.goto("?audit=footer-coral-test");
  const video = page.locator(".footer-coral-video");
  await expect(video).toHaveCount(1);
  expect(await video.getAttribute("src")).toBeNull();
  expect(requests).toEqual([]);
  await page.locator(".source-footer__base").scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate(video => ({
    playing: !video.paused && video.currentTime > 0,
    error: video.error?.code ?? null,
    readyState: video.readyState,
  })), { timeout: 15000 }).toMatchObject({ playing: true, error: null });
  await expect(page.locator(".source-footer")).toHaveAttribute("data-coral", "");
  await page.locator("[data-menu-toggle]").click();
  await expect(video).toHaveJSProperty("paused", true);
  const pause = page.locator("[data-menu] [data-sea-toggle]");
  await pause.click();
  await expect(pause).toHaveText("Включить движение");
  await page.keyboard.press("Escape");
  await expect(video).toHaveJSProperty("paused", true);
  await page.reload();
  await page.locator(".source-footer__base").scrollIntoViewIfNeeded();
  await expect(page.locator(".source-footer")).toHaveAttribute("data-coral", "");
  expect(await video.getAttribute("src")).toBeNull();
  await page.locator("[data-menu-toggle]").click();
  await pause.click();
  await page.keyboard.press("Escape");
  await expect.poll(() => video.evaluate(video => !video.paused), { timeout: 15000 }).toBe(true);
  await page.locator("#delivery").scrollIntoViewIfNeeded();
  await expect(video).toHaveJSProperty("paused", true);
});

for (const mode of ["reduced motion", "save data"]) {
  test(`footer remains readable with a static Coral and no video under ${mode}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.emulateMedia({ reducedMotion: mode === "reduced motion" ? "reduce" : "no-preference" });
    if (mode === "save data") await page.addInitScript(() => {
      Object.defineProperty(navigator, "connection", { configurable: true,
        value: { saveData: true, effectiveType: "4g", addEventListener() {} } });
    });
    const videos = [];
    page.on("request", request => { if (/footer-coral(?:-organic)?\.mp4/.test(request.url())) videos.push(request.url()); });
    await page.goto("?audit=footer-coral-test");
    await page.locator(".source-footer__base").scrollIntoViewIfNeeded();
    await expect(page.locator(".source-footer")).toHaveAttribute("data-coral", "");
    expect(videos).toEqual([]);
    expect(await page.locator(".footer-coral-video").getAttribute("src")).toBeNull();
    const ratio = await page.locator(".footer-coral-art:not(.footer-coral-art--upper)").evaluate(canvas => {
      const rect = canvas.getBoundingClientRect();
      return { intrinsic: canvas.width / canvas.height, rendered: rect.width / rect.height };
    });
    expect(ratio.rendered).toBeCloseTo(ratio.intrinsic, 4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await expect(page.locator('.source-footer__actions a[href="https://t.me/+79166751452"]')).toBeVisible();
    await expect(page.locator('.source-footer__actions a[href="https://wa.me/79166751452"]')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("footer-static-320.png") });
    await page.locator("[data-menu-toggle]").click();
    await page.getByRole("radio", { name: "Ночная", exact: true }).check();
    await page.keyboard.press("Escape");
    await expect(page.locator(".source-footer")).toHaveAttribute("data-coral", "");
    expect(videos).toEqual([]);
    await page.emulateMedia({ contrast: "more" });
    await expect(page.locator(".footer-coral-layer")).toBeHidden();
  });
}

test("unloaded or unavailable Coral never adds horizontal scrolling", async ({ page }) => {
  await page.route("**/footer-coral-poster.webp", route => route.abort());
  await page.route("**/footer-coral-organic.mp4", route => route.abort());
  await page.goto("?audit=footer-coral-test");
  await expect(page.locator(".footer-coral-layer")).toHaveCount(1);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  }
  await page.locator(".source-footer__base").scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  await expect(page.locator('.source-footer__actions a[href="https://t.me/+79166751452"]')).toBeVisible();
});
