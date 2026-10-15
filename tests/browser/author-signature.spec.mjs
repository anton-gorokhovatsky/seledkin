import { test, expect } from "@playwright/test";

const moduleURL = "https://gorokhovatsky.tech/signature/v1/signature.js?v=1.0.4";

test("the shared signature stays readable in the footer across watches and text sizes @signature", async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("seledkin-theme", "light"));
  for (const theme of ["light", "dark"]) {
    await page.goto("about/");
    if (theme === "dark") {
      await page.locator("[data-menu-toggle]").click();
      await page.getByRole("radio", { name: "Ночная", exact: true }).check();
      await page.locator("[data-menu-close]").click();
    }
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const signature = page.locator("ag-signature");
    await expect(signature).toHaveAttribute("data-signature-version", /^1\./);
    await expect(signature.getByRole("link", { name: "Антон Гороховатский Дизайн и разработка" })).toHaveCount(1);
    await expect(page.locator(".source-footer__utilities > a")).toHaveCount(0);
    for (const width of [1440, 638, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      if (width === 320) {
        await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
        await signature.evaluate(node => {
          const style = document.createElement("style");
          style.textContent = "* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; }";
          node.shadowRoot.append(style);
        });
      }
      await signature.scrollIntoViewIfNeeded();
      if (width === 1440) {
        const credit = await signature.boundingBox();
        expect(credit.height).toBeLessThan(100);
      }
      if (width === 390) {
        const group = await signature.boundingBox();
        expect(group.height).toBeLessThan(100);
      }
      if (width === 320) {
        const text = await signature.locator(".text").boundingBox();
        expect(text.width).toBeGreaterThan(250);
      }
      for (const node of await page.locator(".source-footer__legal > small, ag-signature .credit, ag-signature .name, ag-signature .role").all()) {
        const bounds = await node.boundingBox();
        expect(bounds.x).toBeGreaterThanOrEqual(-1);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
      }
      await expect(signature.getByRole("button", { name: "Остановить движение", exact: true })).toBeHidden();
      await page.screenshot({ path: testInfo.outputPath(`signature-${width}-${theme}.png`) });
    }
  }
});

test("the site motion command also pauses the author mark and preserves that choice @signature", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("about/");
  const signature = page.locator("ag-signature");
  const mark = signature.locator(".mark");
  await expect(signature).toHaveAttribute("data-signature-version", /^1\./);
  await signature.scrollIntoViewIfNeeded();
  await expect(mark).toHaveAttribute("data-arc-running", "true");
  await page.locator("[data-menu-toggle]").click();
  await page.locator("[data-menu] [data-sea-toggle]").click();
  await page.locator("[data-menu-close]").click();
  await expect(mark).toHaveAttribute("data-arc-running", "false");
  await page.reload();
  await signature.scrollIntoViewIfNeeded();
  await expect(signature).toHaveAttribute("paused");
  await page.locator("[data-menu-toggle]").click();
  await page.locator("[data-menu] [data-sea-toggle]").click();
  await page.locator("[data-menu-close]").click();
  await signature.scrollIntoViewIfNeeded();
  await expect(mark).toHaveAttribute("data-arc-running", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(mark).toHaveAttribute("data-arc-running", "false");
});

test("a failed shared module leaves the ordinary author link available @signature", async ({ page }) => {
  await page.route(moduleURL, route => route.abort());
  await page.goto("journal/698/");
  const fallback = page.locator("ag-signature > a");
  await expect(fallback).toBeVisible();
  await expect(fallback).toHaveAttribute("href", "https://gorokhovatsky.tech/");
  await fallback.focus();
  await expect(fallback).toBeFocused();
});
