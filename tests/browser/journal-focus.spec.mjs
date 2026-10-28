import { test, expect } from "@playwright/test";

const activeCard = page => page.locator('[data-hero-journal-card][data-stack-position="0"]');
const settle = page => page.locator('[data-hero-journal-stack]').evaluate(async stack => {
  await Promise.allSettled([...stack.querySelectorAll("img")].map(image => image.decode()));
  await Promise.allSettled(stack.getAnimations({ subtree: true }).map(animation => animation.finished));
});

test("a delayed module reveals the portrait mask without a first-frame square", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/assets/site.js*", async route => {
    await new Promise(resolve => setTimeout(resolve, 400));
    await route.continue();
  });
  await page.goto("?audit=journal-focus-first-frame", { waitUntil: "commit" });
  await page.waitForFunction(() => document.querySelector('[data-hero-journal]')?.hasAttribute("data-ready"));
  const firstFrame = await page.locator('[data-hero-journal-stack]').evaluate(stack => {
    const rear = stack.querySelector('[data-stack-position="1"] img');
    return {
      clipRight: Number.parseFloat(getComputedStyle(rear).clipPath.match(/inset\([^ ]+ ([^ ]+)/)[1]),
      expectedRight: Number.parseFloat(getComputedStyle(stack).getPropertyValue("--journal-clip-right")),
      transitions: rear.getAnimations().filter(animation => animation.transitionProperty === "clip-path").length,
    };
  });
  expect(firstFrame.clipRight).toBeCloseTo(firstFrame.expectedRight, 3);
  expect(firstFrame.transitions).toBe(0);
  await page.locator('.source-hero').screenshot({ path: testInfo.outputPath("initial-reveal.png") });
});

test("a portrait bounds the rear sheets, and every selected photograph stays complete", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const [width, theme] of [[1440, "light"], [980, "dark"]]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(theme => localStorage.setItem("seledkin-theme", theme), theme);
    await page.goto("?audit=journal-focus");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('[data-hero-journal]')).toHaveAttribute("data-ready", "");
    await settle(page);
    const navigationTop = await page.locator('.source-hero__journal-controls').evaluate(el => el.getBoundingClientRect().top + scrollY);
    const count = await page.locator('[data-hero-journal-card]').count();
    for (let index = 0; index < count; index++) {
      await settle(page);
      const result = await page.locator('[data-hero-journal-stack]').evaluate(stack => {
        const active = stack.querySelector('[data-stack-position="0"] img');
        const ratio = Number(active.getAttribute("width")) / Number(active.getAttribute("height"));
        const styles = getComputedStyle(stack);
        const rear = [...stack.querySelectorAll('[data-stack-position="1"] img, [data-stack-position="2"] img')];
        return {
          right: parseFloat(styles.getPropertyValue("--journal-clip-right")),
          bottom: parseFloat(styles.getPropertyValue("--journal-clip-bottom")),
          expectedRight: (1 - Math.min(1, ratio)) * 100,
          expectedBottom: (1 - Math.min(1, 1 / ratio)) * 100,
          fit: getComputedStyle(active).objectFit,
          filter: getComputedStyle(active).filter,
          clip: getComputedStyle(active).clipPath,
          rear: rear.map(image => ({ width: image.naturalWidth, filter: getComputedStyle(image).filter, clip: getComputedStyle(image).clipPath })),
        };
      });
      expect(result.right).toBeCloseTo(result.expectedRight, 3);
      expect(result.bottom).toBeCloseTo(result.expectedBottom, 3);
      expect(result.fit).toBe("contain");
      expect(result.filter).toBe("blur(0px) brightness(1)");
      expect(result.clip).toBe("inset(0px)");
      for (const rear of result.rear) {
        expect(rear.width).toBeGreaterThan(32);
        expect(rear.filter).toContain("brightness(0.72)");
        if (result.right > 1 || result.bottom > 1) expect(rear.clip).not.toBe("inset(0px 0% 0% 0px)");
      }
      expect(await page.locator('.source-hero__journal-controls').evaluate(el => el.getBoundingClientRect().top + scrollY)).toBeCloseTo(navigationTop, 0);
      if (index === 0) await page.locator('.source-hero').screenshot({ path: testInfo.outputPath(`portrait-${width}-${theme}.png`) });
      if (index < count - 1) await page.locator('[data-hero-journal-next]').click();
    }
    // The return path must restore the same portrait mask and keyboard target.
    await activeCard(page).focus();
    for (let index = count - 1; index > 0; index--) await page.keyboard.press("ArrowLeft");
    await settle(page);
    await expect(activeCard(page)).toBeFocused();
    await expect(page.locator('[data-hero-journal-counter]')).toHaveText(`1 из ${count}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});

test("focus transitions can reverse immediately and respect reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("?audit=journal-focus-interruption");
  await settle(page);
  await page.locator('[data-hero-journal-next]').click();
  expect(await activeCard(page).locator("img").evaluate(image => image.getAnimations().some(animation => animation.transitionProperty === "filter"))).toBe(true);
  await page.locator('[data-hero-journal-previous]').click();
  await settle(page);
  await expect(page.locator('[data-hero-journal-counter]')).toHaveText("1 из 5");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator('[data-hero-journal-next]').click();
  expect(parseFloat(await activeCard(page).locator("img").evaluate(image => getComputedStyle(image).transitionDuration))).toBeLessThan(0.001);
  await settle(page);
  expect(await activeCard(page).locator("img").evaluate(image => getComputedStyle(image).filter)).toBe("blur(0px) brightness(1)");
});

test("without JavaScript the first full photograph has no exposed placeholders", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(`${baseURL}?audit=journal-focus-nojs`);
  await expect(activeCard(page)).toBeVisible();
  const placeholders = page.locator('[data-hero-journal-card]:not([data-stack-position="0"])');
  for (const card of await placeholders.all()) await expect(card).toBeHidden();
  await expect(activeCard(page)).toHaveAttribute("href", /^journal\/\d+\/$/);
  await context.close();
});
