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
  await expect(frame(page)).toHaveAttribute("data-phase", "rest");
  await expect(page.locator(".afisha")).toHaveAttribute("data-photo-index", String(index + 1));
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

async function beginPhotoAudit(page, allowedIndexes = null) {
  await frame(page).evaluate((element, indexes) => {
    const photos = [...element.querySelectorAll(".afisha__print")];
    const allowed = indexes?.map(index => photos[index].dataset.productId);
    const audit = { active: true, frames: 0, minOpacity: 1, maxImages: 0, unexpectedSelections: [], unexpectedPaint: [] };
    window.afishaPhotoAudit = audit;
    const sample = () => {
      if (!audit.active) return;
      audit.frames++;
      audit.maxImages = Math.max(audit.maxImages, element.querySelectorAll("img").length);
      for (const photo of element.querySelectorAll(".afisha__print:not([hidden])")) {
        audit.minOpacity = Math.min(audit.minOpacity, Number(getComputedStyle(photo).opacity));
      }
      const selected = element.closest(".afisha").dataset.productId;
      if (allowed && !allowed.includes(selected) && !audit.unexpectedSelections.includes(selected)) audit.unexpectedSelections.push(selected);
      if (allowed) {
        const box = element.getBoundingClientRect();
        const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        const owners = photos.filter(photo => !photo.hidden).filter(photo => {
          const rect = photo.getBoundingClientRect();
          const matrix = new DOMMatrix(getComputedStyle(photo).transform);
          const local = new DOMPoint(point.x - rect.x - rect.width / 2, point.y - rect.y - rect.height / 2)
            .matrixTransform(new DOMMatrix([matrix.a, matrix.b, matrix.c, matrix.d, 0, 0]).inverse());
          return Math.abs(local.x) <= photo.offsetWidth / 2 && Math.abs(local.y) <= photo.offsetHeight / 2;
        }).sort((a, b) => Number(getComputedStyle(b).zIndex) - Number(getComputedStyle(a).zIndex));
        const painted = owners[0]?.dataset.productId ?? "none";
        if (!allowed.includes(painted) && !audit.unexpectedPaint.includes(painted)) audit.unexpectedPaint.push(painted);
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }, allowedIndexes);
}

async function endPhotoAudit(page) {
  const audit = await page.evaluate(() => {
    window.afishaPhotoAudit.active = false;
    return window.afishaPhotoAudit;
  });
  expect(audit.frames).toBeGreaterThan(2);
  expect(audit.minOpacity).toBe(1);
  expect(audit.maxImages).toBe(5);
  expect(audit.unexpectedSelections).toEqual([]);
  expect(audit.unexpectedPaint).toEqual([]);
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
  // The generous control area owns the selected photo, including the visible
  // background-card edge under a right thumb outside the narrow front print.
  const box = await frame(page).boundingBox();
  await page.mouse.move(box.x + box.width * .8, point.y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .8 - 110, point.y, { steps: 8 });
  await page.mouse.up();
  await settled(page, 1);
  await bindings(page, 1);
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
  await expect(frame(page)).toHaveAttribute("data-settling", "true");
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
  await page.evaluate(() => {
    window.afishaHeightResize = new Promise(resolve => window.addEventListener("resize", () => resolve(), { once: true }));
  });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.evaluate(() => window.afishaHeightResize);
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

test("backward drags keep the original photographs opaque through direction changes and release @afisha", async ({ page }, testInfo) => {
  await ready(page);
  await beginPhotoAudit(page);
  // Exercise portrait→square and square→portrait, including both sides of zero.
  for (const start of [0, 1]) {
    const steps = (start - await selected(page) + 5) % 5;
    for (let step = 0; step < steps; step++) await frame(page).press("ArrowRight");
    await settled(page, start);
    const point = await grip(page);
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    for (const dx of [48, 8, 1, -1, -60, 110]) {
      await page.mouse.move(point.x + dx, point.y + 3, { steps: 4 });
      await render(page);
    }
    await page.screenshot({ path: testInfo.outputPath(`backward-opaque-${start}.png`) });
    await page.mouse.up();
    await settled(page, (start + 4) % 5);
    await bindings(page, (start + 4) % 5);
    await expect(page).toHaveURL(/\/?\?audit=afisha-gesture$/);
  }
  await endPhotoAudit(page);
});

test("a short previous flick never flashes or selects the next product between its two photographs @afisha", async ({ page }) => {
  await ready(page);
  for (const start of [0, 1]) for (const pause of [0, 20]) {
    const steps = (start - await selected(page) + 5) % 5;
    for (let step = 0; step < steps; step++) await frame(page).press("ArrowRight");
    await settled(page, start);
    await beginPhotoAudit(page, [start, (start + 4) % 5]);
    const point = await grip(page);
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    if (!pause) {
      await page.mouse.move(point.x + 44, point.y + 2, { steps: 2 });
    } else for (const dx of [15, 30, 45, 60]) {
      if (dx > 15) await page.waitForTimeout(pause);
      await page.mouse.move(point.x + dx, point.y + 2);
    }
    // No screenshot or remote inspection here: preserve the actual flick speed.
    await page.mouse.up();
    if (!pause) await settled(page, (start + 4) % 5);
    else {
      // Remote event delivery can turn a small flick into a deliberate cancel.
      // Both are valid; an unrelated middle product is never a valid outcome.
      await expect(frame(page)).toHaveAttribute("data-phase", "rest");
      expect([start, (start + 4) % 5]).toContain(await selected(page));
    }
    await bindings(page, await selected(page));
    await endPhotoAudit(page);
  }
});

test("pulling the outgoing photograph back restores it instead of advancing to another product @afisha", async ({ page }) => {
  await ready(page);
  await beginPhotoAudit(page, [0, 4]);
  const positions = await frame(page).evaluate(async element => {
    const box = element.getBoundingClientRect();
    const photo = element.querySelector(".afisha__print");
    const pointer = (type, id, x, y) => element.dispatchEvent(new PointerEvent(type, {
      pointerId: id, pointerType: "touch", isPrimary: true, button: 0,
      buttons: type === "pointerup" ? 0 : 1, clientX: x, clientY: y, bubbles: true, cancelable: true,
    }));
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const physicalX = () => new DOMMatrix(getComputedStyle(photo).transform).e + photo.offsetWidth / 2;
    const x = box.left + box.width / 2, y = box.top + box.height * .7;
    pointer("pointerdown", 501, x, y);
    pointer("pointermove", 501, x + 120, y);
    await sleep(160);
    pointer("pointerup", 501, x + 120, y);
    // Observe and grab the same real outgoing card in this event turn;
    // driver round trips must not consume the short departing window.
    const rightGrip = box.left + box.width * .88;
    const cardBox = photo.getBoundingClientRect();
    const matrix = new DOMMatrix(getComputedStyle(photo).transform);
    const local = new DOMPoint(rightGrip - cardBox.x - cardBox.width / 2,
      y - cardBox.y - cardBox.height / 2).matrixTransform(new DOMMatrix([matrix.a, matrix.b, matrix.c, matrix.d, 0, 0]).inverse());
    if (Math.abs(local.x) > photo.offsetWidth / 2 || Math.abs(local.y) > photo.offsetHeight / 2) throw new Error("The regrab must land on the actual outgoing photograph");
    const start = physicalX();
    pointer("pointerdown", 502, rightGrip, y);
    for (const dx of [20, 40, 60, 80]) {
      await sleep(40);
      pointer("pointermove", 502, rightGrip - dx, y);
    }
    await sleep(160);
    const end = physicalX();
    pointer("pointerup", 502, rightGrip - 80, y);
    return { start, end };
  });
  expect(positions.end).toBeGreaterThan(0);
  expect(positions.end).toBeLessThan(positions.start);
  await settled(page, 0);
  await bindings(page, 0);
  await endPhotoAudit(page);
  await expect(page).toHaveURL(/\/?\?audit=afisha-gesture$/);
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
  await beginPhotoAudit(page);
  point = await grip(page);
  await touch("touchStart", point.x, point.y);
  for (const dx of [48, 8, -30, 110]) {
    await touch("touchMove", point.x + dx, point.y + 2);
    await page.waitForTimeout(25);
  }
  await touch("touchEnd");
  await settled(page, 0);
  await bindings(page, 0);
  await endPhotoAudit(page);
  await beginPhotoAudit(page, [0, 4]);
  point = await grip(page);
  await touch("touchStart", point.x, point.y);
  for (const dx of [15, 30, 45, 60]) {
    if (dx > 15) await page.waitForTimeout(20);
    await touch("touchMove", point.x + dx, point.y + 2);
  }
  await touch("touchEnd");
  await expect(frame(page)).toHaveAttribute("data-phase", "rest");
  expect([0, 4]).toContain(await selected(page));
  await bindings(page, await selected(page));
  await endPhotoAudit(page);
  await expect(page).toHaveURL(/\?audit=afisha-native-touch$/);
  await page.screenshot({ path: testInfo.outputPath("native-touch-both-directions.png") });
  await context.close();
});
