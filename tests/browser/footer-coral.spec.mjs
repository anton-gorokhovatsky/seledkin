import { test, expect } from "@playwright/test";

test("footer Coral loads on approach, shares the sea pause and stops offscreen", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const requests = [];
  page.on("request", request => {
    if (/footer-coral\.(?:mp4|png)/.test(request.url())) requests.push(request.url());
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
  await expect(pause).toHaveText("Включить море");
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
    page.on("request", request => { if (/footer-coral\.mp4/.test(request.url())) videos.push(request.url()); });
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
    await page.locator("[data-menu] [data-theme-toggle]").click();
    await page.keyboard.press("Escape");
    await expect(page.locator(".source-footer")).toHaveAttribute("data-coral", "");
    expect(videos).toEqual([]);
    await page.emulateMedia({ contrast: "more" });
    await expect(page.locator(".footer-coral-layer")).toBeHidden();
  });
}

test("unloaded or unavailable Coral never adds horizontal scrolling", async ({ page }) => {
  await page.route("**/footer-coral-poster.png", route => route.abort());
  await page.route("**/footer-coral.mp4", route => route.abort());
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
