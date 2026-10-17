import { test, expect } from "@playwright/test";

const opener = page => page.getByRole("button", { name: "Открыть меню", exact: true });
const closer = page => page.getByRole("button", { name: "Закрыть меню", exact: true });

test("menu reveal preserves its layout and reverses without stranding focus or the page @navigation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("?audit=menu-motion");
    await page.evaluate(() => document.fonts.ready);
    const button = await opener(page).boundingBox();
    const x = button.x + button.width / 2;
    const y = button.y + button.height / 2;
    await page.mouse.click(x, y);
    const opening = await page.locator("[data-menu]").evaluate(menu => {
      const panel = menu.querySelector(".site-menu__panel");
      const duration = panel.getAnimations()[0].effect.getTiming().duration;
      for (const motion of menu.getAnimations({ subtree: true })) {
        motion.pause();
        motion.currentTime = duration / 3;
      }
      const title = menu.querySelector("#menu-title").getBoundingClientRect();
      return { clip: getComputedStyle(menu).clipPath, opacity: +getComputedStyle(panel).opacity,
        seaOpacity: +getComputedStyle(menu.querySelector(".site-menu__veil")).opacity,
        title: { x: title.x, y: title.y, width: title.width } };
    });
    expect(opening.clip).toBe("none");
    expect(opening.opacity).toBeGreaterThan(0);
    expect(opening.opacity).toBeLessThan(1);
    expect(opening.seaOpacity).toBeGreaterThan(opening.opacity);
    if (process.env.MENU_PROOF_DIR) {
      await page.screenshot({ path: `${process.env.MENU_PROOF_DIR}/menu-reveal-${width}-opening.png` });
    }
    await expect(closer(page)).toBeFocused();
    await expect(page.locator("main")).toHaveJSProperty("inert", true);
    // Interrupt opening, then reverse the exit before its old completion callback.
    await page.mouse.click(x, y);
    await expect(opener(page)).toBeFocused();
    await expect(page.locator("main")).toHaveJSProperty("inert", false);
    await page.mouse.click(x, y);
    await expect(closer(page)).toBeFocused();
    await expect.poll(() => page.locator(".site-menu__panel").evaluate(panel => panel.getAnimations().length)).toBe(0);
    await expect(page.locator("[data-menu]")).toBeVisible();
    await expect(page.locator("main")).toHaveJSProperty("inert", true);
    const settled = await page.locator("#menu-title").boundingBox();
    expect(settled.x).toBeCloseTo(opening.title.x, 1);
    expect(opening.title.y - settled.y).toBeGreaterThanOrEqual(0);
    expect(opening.title.y - settled.y).toBeLessThanOrEqual(12);
    expect(settled.width).toBeCloseTo(opening.title.width, 1);
    if (process.env.MENU_PROOF_DIR) {
      await page.screenshot({ path: `${process.env.MENU_PROOF_DIR}/menu-reveal-${width}.png` });
    }
    await closer(page).click();
    await expect(page.locator("[data-menu]")).toBeHidden();
    await expect(opener(page)).toBeFocused();
    expect(await page.evaluate(() => document.body.classList.contains("menu-open"))).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("keyboard, resize and reduced motion finish the reveal without delaying navigation @navigation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("?audit=menu-motion-keyboard");
  await opener(page).focus();
  await page.keyboard.press("Enter");
  expect(await page.locator(".site-menu__panel").evaluate(panel => panel.getAnimations().length)).toBe(0);
  await expect(closer(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-menu]")).toBeHidden();
  await expect(opener(page)).toBeFocused();

  await opener(page).click();
  // Keyboard traversal must expose the full focused destination immediately.
  await page.keyboard.press("Tab");
  expect(await page.locator(".site-menu__panel").evaluate(panel => panel.getAnimations().length)).toBe(0);
  await expect(page.getByRole("navigation", { name: "Меню сайта", exact: true })
    .getByRole("link", { name: "Продукты и цены", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");

  await opener(page).click();
  await page.setViewportSize({ width: 1024, height: 600 });
  await expect.poll(() => page.locator(".site-menu__panel").evaluate(panel => panel.getAnimations().length)).toBe(0);
  expect(await page.locator("[data-menu]").evaluate(menu => getComputedStyle(menu).clipPath)).toBe("none");
  await page.keyboard.press("Escape");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await opener(page).click();
  const reduced = await page.locator("[data-menu]").evaluate(menu => ({
    clip: getComputedStyle(menu).clipPath,
    moving: menu.getAnimations({ subtree: true }).some(animation => animation.effect.getKeyframes().some(frame => frame.clipPath || frame.transform)),
  }));
  expect(reduced).toEqual({ clip: "none", moving: false });
  await page.getByRole("navigation", { name: "Меню сайта", exact: true })
    .getByRole("link", { name: "Контакты", exact: true }).click();
  await expect(page).toHaveURL(/#contacts$/);
  await expect(page.locator("[data-menu]")).toBeHidden();
  await expect(page.locator("main")).toHaveJSProperty("inert", false);
  await expect(page.locator("#contacts h2")).toBeInViewport();
});

test("finishing the tide does not flash its glass backgrounds @navigation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    localStorage.setItem("seledkin-sea-paused", "true");
    localStorage.setItem("seledkin-theme", new URL(location.href).searchParams.get("test-watch") || "light");
  });
  for (const theme of ["light", "dark"]) for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`?audit=menu-tide-glass&test-watch=${theme}`);
    await page.evaluate(() => document.fonts.ready);
    await opener(page).click();
    await page.locator(".site-menu__panel").evaluate(panel => {
      for (const motion of panel.parentElement.getAnimations({ subtree: true })) {
        motion.pause();
        motion.currentTime = motion.effect.getComputedTiming().endTime - .01;
      }
    });
    const clip = { x: 4, y: 4, width: 10, height: 10 };
    const lastFrame = await page.screenshot({ clip });
    await page.locator(".site-menu__panel").evaluate(panel => {
      for (const motion of panel.parentElement.getAnimations({ subtree: true })) motion.finish();
    });
    await expect.poll(() => page.locator(".site-menu__panel").evaluate(panel => panel.getAnimations().length)).toBe(0);
    expect(await page.screenshot({ clip })).toEqual(lastFrame);
  }
});
