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
      const motion = menu.getAnimations()[0];
      motion.pause();
      motion.currentTime = motion.effect.getTiming().duration / 3;
      const title = menu.querySelector("#menu-title").getBoundingClientRect();
      return { clip: getComputedStyle(menu).clipPath, title: { x: title.x, y: title.y, width: title.width } };
    });
    expect(opening.clip).toMatch(/^inset\(/);
    expect(opening.clip).not.toMatch(/^inset\(0px/);
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
    await expect.poll(() => page.locator("[data-menu]").evaluate(menu => menu.getAnimations().length)).toBe(0);
    await expect(page.locator("[data-menu]")).toBeVisible();
    await expect(page.locator("main")).toHaveJSProperty("inert", true);
    const settled = await page.locator("#menu-title").boundingBox();
    expect(settled.x).toBeCloseTo(opening.title.x, 1);
    expect(settled.y).toBeCloseTo(opening.title.y, 1);
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
  expect(await page.locator("[data-menu]").evaluate(menu => menu.getAnimations().length)).toBe(0);
  await expect(closer(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-menu]")).toBeHidden();
  await expect(opener(page)).toBeFocused();

  await opener(page).click();
  // Keyboard traversal must expose the full focused destination immediately.
  await page.keyboard.press("Tab");
  expect(await page.locator("[data-menu]").evaluate(menu => menu.getAnimations().length)).toBe(0);
  await expect(page.getByRole("navigation", { name: "Меню сайта", exact: true })
    .getByRole("link", { name: "Продукты и цены", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");

  await opener(page).click();
  await page.setViewportSize({ width: 1024, height: 600 });
  await expect.poll(() => page.locator("[data-menu]").evaluate(menu => menu.getAnimations().length)).toBe(0);
  expect(await page.locator("[data-menu]").evaluate(menu => getComputedStyle(menu).clipPath)).toBe("none");
  await page.keyboard.press("Escape");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await opener(page).click();
  const reduced = await page.locator("[data-menu]").evaluate(menu => ({
    clip: getComputedStyle(menu).clipPath,
    moving: menu.getAnimations().some(animation => animation.effect.getKeyframes().some(frame => frame.clipPath || frame.transform)),
  }));
  expect(reduced).toEqual({ clip: "none", moving: false });
  await page.getByRole("navigation", { name: "Меню сайта", exact: true })
    .getByRole("link", { name: "Контакты", exact: true }).click();
  await expect(page).toHaveURL(/#contacts$/);
  await expect(page.locator("[data-menu]")).toBeHidden();
  await expect(page.locator("main")).toHaveJSProperty("inert", false);
  await expect(page.locator("#contacts h2")).toBeInViewport();
});
