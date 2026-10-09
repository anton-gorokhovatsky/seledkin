import { test, expect } from "@playwright/test";

const box = locator => locator.evaluate(element => {
  const { top, bottom, left, right } = element.getBoundingClientRect();
  return { top, bottom, left, right };
});
const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
const proof = async (page, name) => {
  if (process.env.MENU_PROOF_DIR) await page.screenshot({ path: `${process.env.MENU_PROOF_DIR}/${name}.png` });
};

test("desktop menu keeps contacts in place while routes scroll, including short windows", async ({ browser, baseURL }) => {
  test.setTimeout(90000);
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    await context.addInitScript(value => localStorage.setItem("seledkin-theme", value), theme);
    const page = await context.newPage();
    for (const viewport of [{ width: 1624, height: 930 }, { width: 1024, height: 600 }]) {
      await page.setViewportSize(viewport);
      await page.goto(new URL("?audit=menu-scroll", baseURL).href);
      await page.getByRole("button", { name: "Открыть меню", exact: true }).click();
      await page.evaluate(() => document.fonts.ready);
      const panel = page.locator(".site-menu__panel");
      const service = page.locator(".site-menu__service");
      const serviceScroll = page.locator(".site-menu__service-inner");
      const close = page.getByRole("button", { name: "Закрыть меню", exact: true });
      const hours = service.locator("h3");
      const hoursBefore = await box(hours);
      expect(hoursBefore.top).toBeGreaterThan((await box(close)).bottom + 12);
      expect(overlaps(await box(page.locator(".site-menu__brand")), await box(page.locator("#menu-title")))).toBe(false);
      await proof(page, `menu-${theme}-${viewport.width}-top`);

      await page.mouse.move(200, viewport.height / 2);
      await page.mouse.wheel(0, 10000);
      await expect.poll(() => panel.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
      expect(Math.abs((await box(hours)).top - hoursBefore.top)).toBeLessThan(1);
      expect((await box(service)).top).toBeGreaterThanOrEqual(-1);
      expect((await box(service)).bottom).toBeLessThanOrEqual(viewport.height + 1);
      expect(overlaps(await box(page.locator(".site-menu__brand")), await box(page.locator("#menu-title")))).toBe(false);
      await expect(close).toBeInViewport();
      await proof(page, `menu-${theme}-${viewport.width}-bottom`);

      // A short window still exposes the last action without moving the routes.
      const routesPosition = await panel.evaluate(element => element.scrollTop);
      const lastAction = service.locator("[data-theme-toggle]");
      await lastAction.focus();
      await expect(lastAction).toBeInViewport();
      expect((await box(lastAction)).top).toBeGreaterThan((await box(close)).bottom);
      expect(await panel.evaluate(element => element.scrollTop)).toBe(routesPosition);
      await close.click();
      await page.getByRole("button", { name: "Открыть меню", exact: true }).click();
      expect(await panel.evaluate(element => element.scrollTop)).toBe(0);
      expect(await serviceScroll.evaluate(element => element.scrollTop)).toBe(0);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Открыть меню", exact: true })).toBeFocused();
    }
    await context.close();
  }
});

test("mobile menu reaches both scroll boundaries and keeps keyboard focus below its header", async ({ browser, baseURL }) => {
  test.setTimeout(90000);
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    await context.addInitScript(value => localStorage.setItem("seledkin-theme", value), theme);
    const page = await context.newPage();
    for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 320, height: 568, enlarged: true }]) {
      await page.setViewportSize(viewport);
      await page.goto(new URL("?audit=menu-scroll", baseURL).href);
      if (viewport.enlarged) await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
      await page.getByRole("button", { name: "Открыть меню", exact: true }).click();
      await page.evaluate(() => document.fonts.ready);
      const menu = page.getByRole("dialog");
      const panel = page.locator(".site-menu__panel");
      const close = page.getByRole("button", { name: "Закрыть меню", exact: true });
      const header = page.locator(".site-menu__masthead");
      const logo = await box(page.locator(".site-menu__brand img"));
      expect(logo.top).toBeGreaterThanOrEqual((await box(header)).top);
      expect(logo.bottom).toBeLessThanOrEqual((await box(header)).bottom);
      const name = `menu-${theme}-${viewport.width}${viewport.enlarged ? "-enlarged" : ""}`;
      await proof(page, `${name}-top`);
      await page.mouse.move(viewport.width / 2, viewport.height / 2);
      await page.mouse.wheel(0, 50000);
      await expect.poll(() => panel.evaluate(element => element.scrollHeight - element.clientHeight - element.scrollTop)).toBeLessThan(2);
      await expect(menu.locator("[data-theme-toggle]")).toBeInViewport();
      await expect(close).toBeInViewport();
      await proof(page, `${name}-bottom`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

      await menu.locator("[data-theme-toggle]").focus();
      const count = await menu.locator("a[href], button:not([disabled])").filter({ visible: true }).count();
      for (let step = 0; step < count; step++) {
        const focused = await menu.evaluate(element => {
          const active = document.activeElement;
          const { top, bottom } = active.getBoundingClientRect();
          return { inMenu: element.contains(active), close: active.hasAttribute("data-menu-close"), top, bottom, label: active.textContent.trim() };
        });
        expect(focused.inMenu).toBe(true);
        expect(focused.bottom, focused.label).toBeLessThanOrEqual(viewport.height + 1);
        expect(focused.top, focused.label).toBeGreaterThanOrEqual(focused.close ? 0 : (await box(header)).bottom - 1);
        await page.keyboard.press("Shift+Tab");
      }
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Открыть меню", exact: true })).toBeFocused();
    }
    await context.close();
  }
});
