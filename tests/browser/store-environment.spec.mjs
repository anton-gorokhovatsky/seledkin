import { test, expect } from "@playwright/test";

test.use({ timezoneId: "Pacific/Honolulu", reducedMotion: "no-preference" });

async function connection(page, saveData, effectiveType = "4g") {
  await page.addInitScript(({ saveData, effectiveType }) => {
    window.testConnection = Object.assign(new EventTarget(), { saveData, effectiveType });
    Object.defineProperty(navigator, "connection", { value: window.testConnection, configurable: true });
  }, { saveData, effectiveType });
}

test("shop status crosses Moscow boundaries without overriding an explicit watch", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-01T07:59:00Z") });
  await page.clock.pauseAt(new Date("2026-10-01T07:59:58Z"));
  await page.addInitScript(() => localStorage.setItem("seledkin-theme", "dark"));
  await page.goto("");
  await expect(page.locator("#contacts [data-store-status]")).toHaveText("Откроемся сегодня в 11:00");
  await page.clock.fastForward(3_000);
  await expect(page.locator("#contacts [data-store-status]")).toHaveText("Сегодня открыто до 20:00");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.clock.fastForward(9 * 3_600_000);
  for (const node of await page.locator("[data-store-status]").all()) {
    await expect(node).toHaveText("Откроемся завтра в 11:00");
    await expect(node).not.toHaveAttribute("aria-live");
  }
  await expect(page.locator("#contacts .contacts-source__details")).toContainText("Ежедневно с 11:00 до 20:00");
  await expect(page.locator("#menu-service-title")).toHaveText("Ежедневно с 11:00 до 20:00");
  await expect(page.locator(".source-footer__lead")).toContainText("Каждый день с 11:00 до 20:00");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.clock.fastForward(4 * 3_600_000);
  await expect(page.locator("#contacts [data-store-status]")).toHaveText("Откроемся сегодня в 11:00");
});

test("sunlight shares one state between the hero and menu, below their text", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.setFixedTime(new Date("2026-10-01T15:00:00Z"));
  await page.addInitScript(() => localStorage.setItem("seledkin-theme", "light"));
  await page.goto("");
  await expect(page.locator("html")).toHaveAttribute("data-sea-light", "evening");
  // WebKit can expose the new root state before painting its inherited styles.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const heroField = await page.locator(".source-hero").evaluate(node => getComputedStyle(node, "::before").backgroundImage);
  await page.locator("[data-menu-toggle]").click();
  await expect.poll(() => page.locator(".site-menu__layout").evaluate(node => getComputedStyle(node, "::before").backgroundImage)).toBe(heroField);
  await page.locator("[data-menu] [data-theme-toggle]").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-sea-light", "evening");
  await expect.poll(() => page.locator(".site-menu__layout").evaluate(node => getComputedStyle(node, "::before").opacity)).toBe("0.25");
  await page.emulateMedia({ contrast: "more" });
  await expect.poll(() => page.locator(".site-menu__layout").evaluate(node => getComputedStyle(node, "::before").display)).toBe("none");
});

test("save-data prevents video requests through theme changes and navigation until an explicit start", async ({ page }) => {
  await connection(page, true);
  const requests = [];
  page.on("request", request => { if (/\.mp4(?:\?|$)/.test(request.url())) requests.push(request.url()); });
  await page.goto("");
  await page.locator("[data-menu-toggle]").click();
  await page.locator("[data-menu] [data-theme-toggle]").click();
  const toggle = page.locator("[data-menu] [data-sea-toggle]");
  await expect(toggle).toHaveText("Включить море");
  expect(await page.locator("[data-theme-video-source][src]").count()).toBe(0);
  await page.goto("journal/698/");
  await page.locator("[data-menu-toggle]").click();
  await expect(toggle).toHaveText("Включить море");
  expect(requests).toEqual([]);
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => page.locator("[data-menu-sea-video]").evaluate(video => !video.paused && video.readyState >= 2)).toBe(true);
  expect(requests.length).toBeGreaterThan(0);
  await toggle.click();
  await expect.poll(() => page.locator("[data-menu-sea-video]").evaluate(video => video.paused)).toBe(true);
  await toggle.click();
  await page.evaluate(() => testConnection.dispatchEvent(new Event("change")));
  await expect.poll(() => page.locator("[data-menu-sea-video]").evaluate(video => !video.paused)).toBe(true);
  await page.evaluate(() => {
    testConnection.saveData = false;
    testConnection.dispatchEvent(new Event("change"));
    testConnection.saveData = true;
    testConnection.dispatchEvent(new Event("change"));
  });
  await expect(toggle).toHaveText("Включить море");
  expect(await page.locator("[data-theme-video-source][src]").count()).toBe(0);
  const beforeReload = requests.length;
  await page.reload();
  await page.locator("[data-menu-toggle]").click();
  await expect(toggle).toHaveText("Включить море");
  expect(requests.length).toBe(beforeReload);
});

test("2G also uses the poster and reduced motion stays the stronger preference", async ({ page }) => {
  await connection(page, false, "2g");
  const requests = [];
  page.on("request", request => { if (/\.mp4(?:\?|$)/.test(request.url())) requests.push(request.url()); });
  await page.goto("");
  await page.locator("[data-menu-toggle]").click();
  await expect(page.locator("[data-menu] [data-sea-toggle]")).toHaveText("Включить море");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("[data-menu] [data-sea-toggle]")).toBeHidden();
  await page.locator("[data-menu] [data-theme-toggle]").click();
  expect(await page.locator("[data-theme-video-source][src]").count()).toBe(0);
  expect(requests).toEqual([]);
});
