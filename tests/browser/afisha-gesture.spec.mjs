import { test, expect } from "@playwright/test";

test.use({ reducedMotion: "no-preference" });

const render = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const selected = page => page.locator(".afisha").getAttribute("data-photo-index").then(value => Number(value) - 1);
const frame = page => page.locator(".afisha__frame");

async function ready(page) {
  await page.goto("?audit=afisha-gesture");
  await page.evaluate(() => document.fonts.ready);
  await frame(page).scrollIntoViewIfNeeded();
  await render(page);
}

async function settled(page, index) {
  await expect(page.locator(".afisha")).toHaveAttribute("data-photo-index", String(index + 1));
  await expect.poll(() => frame(page).evaluate(element => element.getAnimations({ subtree: true })
    .filter(animation => animation.playState === "running" || animation.pending).length)).toBe(0);
}

async function bindings(page, index) {
  const photo = frame(page).locator(".afisha__print").nth(index);
  const data = await photo.evaluate(element => ({ ...element.dataset }));
  await expect(page.locator(".afisha__name")).toHaveText(data.caption);
  await expect(page.locator(".afisha__price")).toHaveText(data.price);
  await expect(page.locator(".afisha__order-label")).toHaveText(data.orderLabel);
  await expect(frame(page)).toHaveAttribute("href", data.href);
  await expect(page.locator(".afisha__order-telegram")).toHaveAttribute("href", data.telegram);
  await expect(page.locator(".afisha__order-whatsapp")).toHaveAttribute("href", data.whatsapp);
  await expect(page.locator(".afisha")).toHaveAttribute("data-product-id", data.productId);
  await expect(photo).toHaveAttribute("aria-hidden", "false");
  expect(await photo.locator("img").evaluate(image => getComputedStyle(image).objectFit)).toBe("contain");
}

async function grip(page) {
  const box = await frame(page).boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height * .7, width: box.width };
}

async function drag(page, direction, { release = true } = {}) {
  const point = await grip(page);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + direction * point.width * .42, point.y + 5, { steps: 8 });
  if (release) await page.mouse.up();
  return point;
}

test.beforeEach(async ({ page }) => {
  await page.route(/mc\.yandex|api\.mapbox/, route => route.abort());
  await page.addInitScript(() => localStorage.setItem("seledkin-theme", "dark"));
});

test("the held photograph follows the pointer, cancels a short pull and keeps the actual product @afisha", async ({ page }, testInfo) => {
  await ready(page);
  const point = await grip(page);
  const photo = frame(page).locator(".afisha__print").first();
  const before = await photo.boundingBox();
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 22, point.y + 3, { steps: 5 });
  await render(page);
  const held = await photo.boundingBox();
  expect(held.x - before.x).toBeGreaterThan(4);
  await bindings(page, 0);
  expect(await selected(page)).toBe(0);
  await page.screenshot({ path: testInfo.outputPath("held-short-pull.png") });
  // A deliberate pause makes this a small held pull, not a velocity flick.
  await page.waitForTimeout(160);
  await page.mouse.up();
  await settled(page, 0);
  await bindings(page, 0);
  await expect(page).toHaveURL(/\/?\?audit=afisha-gesture$/);
  const href = await frame(page).getAttribute("href");
  await frame(page).click();
  await page.waitForURL(/\/catalog\//);
  expect(new URL(page.url()).hash).toBe(new URL(href, page.url()).hash);
});

test("photo gestures cycle both ways through all five exact products without a release click @afisha", async ({ page }, testInfo) => {
  await ready(page);
  const total = await frame(page).locator(".afisha__print").count();
  // The backwards neighbour is prepared before the first touch, like the next card.
  await expect.poll(() => frame(page).locator(".afisha__print img").last().evaluate(image => image.naturalWidth)).toBeGreaterThan(32);
  await drag(page, 1);
  await settled(page, total - 1);
  await bindings(page, total - 1);
  for (let index = 0; index < total; index++) {
    await drag(page, -1);
    await settled(page, index);
    await bindings(page, index);
    await expect(page).toHaveURL(/\/?\?audit=afisha-gesture$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  await page.screenshot({ path: testInfo.outputPath("cycle-both-directions.png") });
});

test("a new drag or reverse input retargets a moving stack and keeps the last requested selection @afisha", async ({ page }, testInfo) => {
  await ready(page);
  await drag(page, -1);
  const moving = await frame(page).evaluate(element => element.getAnimations({ subtree: true }).some(animation => animation.playState === "running"));
  expect(moving).toBe(true);
  await page.locator(".afisha__change").click();
  await settled(page, 2);
  await bindings(page, 2);
  // A held card can reverse direction before release; the final direction wins.
  const point = await grip(page);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + point.width * .3, point.y, { steps: 5 });
  await page.mouse.move(point.x - point.width * .42, point.y, { steps: 8 });
  await page.mouse.up();
  await settled(page, 3);
  await bindings(page, 3);
  await drag(page, 1);
  await frame(page).press("ArrowRight");
  await settled(page, 3);
  await bindings(page, 3);
  await page.screenshot({ path: testInfo.outputPath("reverse-and-retarget.png") });
});

test("cancelled pointer ownership and resizing recover without a stale gesture or link @afisha", async ({ page }) => {
  await ready(page);
  await frame(page).evaluate(element => element.addEventListener("pointerdown", event => { element.dataset.testPointer = String(event.pointerId); }));
  await drag(page, -1, { release: false });
  const pointerId = Number(await frame(page).getAttribute("data-test-pointer"));
  await frame(page).dispatchEvent("pointercancel", { pointerId, isPrimary: true, pointerType: "mouse" });
  await page.mouse.up();
  await settled(page, 0);
  await bindings(page, 0);
  await drag(page, 1, { release: false });
  await expect(frame(page)).toHaveAttribute("data-dragging", "true");
  await page.setViewportSize({ width: 430, height: 900 });
  // setViewportSize can return before WebKit dispatches window.resize.
  // Observe cancellation before releasing; otherwise this tests a completed swipe.
  await expect(frame(page)).not.toHaveAttribute("data-dragging", "true");
  await page.mouse.up();
  await settled(page, 0);
  await bindings(page, 0);
  await page.locator(".afisha__change").press("Enter");
  await settled(page, 1);
  await bindings(page, 1);
  await expect(page).toHaveURL(/\/?\?audit=afisha-gesture$/);
});

test("a vertical start stays a cancelled gesture even when the pointer later turns sideways @afisha", async ({ page }) => {
  await ready(page);
  const point = await grip(page);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 9, point.y + 20);
  await page.mouse.move(point.x - 110, point.y + 25, { steps: 5 });
  await page.mouse.up();
  await settled(page, 0);
  await bindings(page, 0);
  await expect(page).toHaveURL(/\/?\?audit=afisha-gesture$/);
});

test("regrabbing after the product handoff preserves the remaining outgoing photograph @afisha", async ({ page }) => {
  await ready(page);
  await frame(page).locator(".afisha__print img").first().evaluate(image => image.decode());
  const outgoingSource = await frame(page).locator(".afisha__print img").first().evaluate(image => image.currentSrc);
  await drag(page, -1);
  const handoff = await frame(page).evaluate(async element => {
    const animations = element.getAnimations({ subtree: true });
    animations.forEach(animation => animation.pause());
    const outgoing = element.querySelector(".afisha__print");
    const duration = animations[0].effect.getTiming().duration;
    for (let step = 0; step < 30; step++) {
      animations.forEach(animation => { animation.currentTime = duration * step / 30; });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const opacity = Number(getComputedStyle(outgoing).opacity);
      if (element.closest(".afisha").dataset.photoIndex === "2" && opacity > .1 && opacity < .9) return true;
    }
    return false;
  });
  expect(handoff).toBe(true);
  const point = await grip(page);
  await page.mouse.move(point.x, point.y);
  // Freeze the captured remainder for the one-frame paint-order comparison;
  // browser/driver latency must not consume its short fade before observation.
  await frame(page).evaluate(element => element.addEventListener("pointerdown", () => {
    element.getAnimations({ subtree: true }).forEach(animation => animation.pause());
  }, { once: true }));
  await page.mouse.down();
  await frame(page).evaluate((element, source) => element.addEventListener("pointermove", () => {
    requestAnimationFrame(() => {
      const currentCard = element.querySelectorAll(".afisha__print")[1];
      const current = getComputedStyle(currentCard);
      const visibleOutgoing = [...element.querySelectorAll("img")].filter(image => image.currentSrc === source)
        .some(image => {
          const card = image.closest(".afisha__print, .afisha__remnant");
          const style = getComputedStyle(card);
          const above = Number(style.zIndex) > Number(current.zIndex)
            || (style.zIndex === current.zIndex && Boolean(currentCard.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING));
          return Number(style.opacity) > 0 && above;
        });
      element.dataset.testOverlay = String(visibleOutgoing);
    });
  }, { once: true }), outgoingSource);
  await page.mouse.move(point.x + 14, point.y);
  await expect(frame(page)).toHaveAttribute("data-test-overlay", "true");
  await frame(page).evaluate(element => element.getAnimations({ subtree: true }).forEach(animation => animation.play()));
  await page.mouse.move(point.x + point.width * .42, point.y, { steps: 6 });
  await page.mouse.up();
  await settled(page, 0);
  await bindings(page, 0);
});

test("reduced motion and keyboard preserve two-way choice and the narrow enlarged-text order @afisha", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  await drag(page, 1);
  await settled(page, 4);
  await bindings(page, 4);
  await frame(page).press("ArrowRight");
  await settled(page, 0);
  await expect(frame(page)).toBeFocused();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.addStyleTag({ content: `html { font-size:200% !important; }
    * { line-height:1.5 !important; letter-spacing:.12em !important; word-spacing:.16em !important; }
    p { margin-bottom:2em !important; }` });
  await page.evaluate(() => document.fonts.ready);
  await frame(page).scrollIntoViewIfNeeded();
  await render(page);
  await drag(page, -1);
  await settled(page, 1);
  await bindings(page, 1);
  await page.locator(".afisha__order summary").press("Enter");
  for (const link of await page.locator(".afisha__order-channels a").all()) {
    await link.focus();
    await expect(link).toBeFocused();
    await expect(link).toBeInViewport();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("gesture-320-text200-spacing.png") });
});

test("native touch keeps vertical page scrolling and a horizontal photo gesture distinct @afisha", async ({ browser, browserName, baseURL }, testInfo) => {
  test.skip(browserName !== "chromium", "Native touch movement is available through Chromium CDP; WebKit pointer paths are covered above.");
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "no-preference" });
  await context.route(/mc\.yandex|api\.mapbox/, route => route.abort());
  const page = await context.newPage();
  await page.goto(`${baseURL}?audit=afisha-native-touch`);
  await page.evaluate(() => document.fonts.ready);
  const session = await context.newCDPSession(page);
  const touch = (type, x, y) => session.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 1, radiusX: 8, radiusY: 8, force: .5 }] });
  let point = await grip(page);
  const startScroll = await page.evaluate(() => scrollY);
  await touch("touchStart", point.x, point.y);
  for (let step = 1; step <= 8; step++) {
    await touch("touchMove", point.x + 2, point.y - step * 18);
    await page.waitForTimeout(20);
  }
  await touch("touchEnd");
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(startScroll + 20);
  expect(await selected(page)).toBe(0);
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await render(page);
  point = await grip(page);
  await touch("touchStart", point.x, point.y);
  for (let step = 1; step <= 8; step++) {
    await touch("touchMove", point.x - step * point.width * .0525, point.y + 2);
    await page.waitForTimeout(20);
  }
  await touch("touchEnd");
  await settled(page, 1);
  await bindings(page, 1);
  await expect(page).toHaveURL(/\?audit=afisha-native-touch$/);
  await page.screenshot({ path: testInfo.outputPath("native-touch-next.png") });
  await context.close();
});
