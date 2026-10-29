import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { catalog } from "../../assets/catalog-data.js";
import { catalogPrice, productHref } from "../../assets/catalog-model.js";
import { editorialPath, recipeForEntry, resolveProduct } from "../../scripts/recipe-content.mjs";
import { mobileHomeEntries, resolveHomeProduct } from "../../scripts/site-content.mjs";

const entries = JSON.parse(readFileSync(new URL("../../content/journal.json", import.meta.url), "utf8"));
const ids = JSON.parse(process.env.EDITORIAL_IDS || JSON.stringify([entries[0].id])).map(String);
const publications = ids.map(id => {
  const entry = entries.find(entry => String(entry.id) === id);
  if (!entry) throw new Error(`Unknown publication selected for release: ${id}`);
  return entry;
});
const plain = text => text.replace(/\u00ad/g, "").replace(/\s+/gu, " ").trim();

for (const entry of publications) {
  const route = editorialPath(entry.id);
  for (const [width, theme, enlarged] of [[1440, "light", false], [390, "dark", false], [320, "light", true]]) {
    test(`publication ${entry.id}: ${width}px ${theme}${enlarged ? " text200+spacing" : ""}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(theme => localStorage.setItem("seledkin-theme", theme), theme);
      await page.route("https://mc.yandex.ru/**", route => route.abort());
      await page.goto(`${route}?audit=editorial-release`);
      if (enlarged) await page.addStyleTag({ content: "html{font-size:200% !important} *{line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important} p{margin-bottom:2em !important}" });
      await page.evaluate(() => document.fonts.ready);
      expect(plain(await page.locator("h1").innerText())).toBe(plain(entry.title));
      await expect(page.locator(".ship-log-entry__meta time")).toHaveAttribute("datetime", entry.date);
      await expect(page.locator(".ship-log-entry__meta a")).toHaveAttribute("href", entry.source?.url ?? `https://t.me/kapitanseledkin/${entry.id}`);
      for (const image of await page.locator(".journal-story > img, .recipe-sequence img").all()) {
        const photo = await image.evaluate(async image => {
          await image.decode();
          return { natural: image.naturalWidth / image.naturalHeight, rendered: image.clientWidth / image.clientHeight, fit: getComputedStyle(image).objectFit };
        });
        expect(photo.fit).not.toBe("cover");
        expect(Math.abs(photo.rendered - photo.natural)).toBeLessThan(.02);
      }
      const inquiry = page.locator(".ship-log-entry__actions a").first();
      await inquiry.focus();
      await expect(inquiry).toBeFocused();
      await expect(inquiry).toBeInViewport();
      const target = await inquiry.boundingBox();
      expect(target.width).toBeGreaterThanOrEqual(44);
      expect(target.height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: testInfo.outputPath(`post-${entry.id}-${width}.png`) });
      if (width !== 1440) {
        const index = mobileHomeEntries.findIndex(item => item.id === entry.id);
        if (index < 0) return;
        const { product } = resolveHomeProduct(entry);
        await page.goto("?audit=editorial-mobile-preview");
        if (enlarged) await page.addStyleTag({ content: "html{font-size:200% !important} *{line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important} p{margin-bottom:2em !important}" });
        await page.evaluate(async () => {
          const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          await frame(); await document.fonts.ready; await frame();
        });
        await expect(page.locator(".afisha__change")).toBeVisible();
        for (let step = 0; step < index; step += 1) await page.locator(".afisha__frame").press("ArrowRight");
        const current = page.locator('.afisha__print[data-position="0"]');
        await expect(current).toHaveAttribute("data-journal-id", String(entry.id));
        await expect(current).toHaveAttribute("data-product-id", product.id);
        const image = current.locator("img");
        expect(new URL(await image.getAttribute("data-source-image"), page.url()).pathname).toBe(`/assets/${entry.image}`);
        await image.evaluate(image => image.decode());
        await expect(image).toHaveCSS("object-fit", "contain");
        await expect(page.locator(".afisha__name")).toHaveText(product.name);
        await expect(page.locator(".afisha__price")).toHaveText(catalogPrice(product.price));
        expect(new URL(await page.locator(".afisha__frame").getAttribute("href"), page.url()).href).toBe(new URL(productHref(product, "", "afisha"), page.url()).href);
        await page.locator(".afisha__order summary").press("Enter");
        const channels = page.locator(".afisha__order-channels a");
        await expect(channels).toHaveCount(2);
        for (const channel of await channels.all()) {
          const draft = new URL(await channel.getAttribute("href")).searchParams.get("text");
          expect(plain(draft)).toContain(plain(product.name));
          expect(plain(draft)).toContain(plain(catalogPrice(product.price)));
        }
        const frame = page.locator(".afisha__frame");
        await frame.focus();
        await expect(frame).toBeFocused();
        await expect(frame).toBeInViewport();
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
        await page.screenshot({ path: testInfo.outputPath(`mobile-preview-${entry.id}-${width}.png`) });
        if (!enlarged) {
          await frame.press("Enter");
          await expect(page.locator(`#product-${product.id}`).getByRole("heading")).toBeInViewport();
        }
        return;
      }

      // Only this publication's preview and product path, never a shared tag set.
      await page.goto("?audit=editorial-preview");
      let preview = page.locator(`main a[href="${route}"]:visible`).first();
      if (!await preview.count()) {
        await page.goto(`${recipeForEntry(entry.id) ? "recipes" : "journal"}/?audit=editorial-preview`);
        preview = page.locator(`main a[href="${entry.id}/"]:visible`).first();
      }
      await preview.press("Enter");
      await expect(page).toHaveURL(new RegExp(`/${route}$`));
      if (entry.editorialOnly) return;
      const selected = recipeForEntry(entry.id)?.products.map(selection => resolveProduct(selection).product.id) ?? entry.catalogProductIds;
      const product = catalog.flatMap(category => category.items).find(product => product.id === selected[0]);
      await page.locator(`.recipe-current a[href*="product=${product.id}#"]`).press("Enter");
      const row = page.locator(`#product-${product.id}`);
      await expect(row.getByRole("heading")).toBeInViewport();
      await expect(row.locator("strong")).toHaveText(catalogPrice(product.price));
      const channels = row.locator('.catalog-product-order__channels a[href^="https://t.me/"], .catalog-product-order__channels a[href^="https://wa.me/"]');
      await expect(channels).toHaveCount(2);
      for (const channel of await channels.all()) {
        const draft = new URL(await channel.getAttribute("href")).searchParams.get("text");
        expect(plain(draft)).toContain(plain(product.name));
        expect(plain(draft)).toContain(plain(catalogPrice(product.price)));
      }
    });
  }
  test(`publication ${entry.id}: readable without JavaScript`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(`${baseURL}${route}?audit=editorial-static`);
    expect(plain(await page.locator("h1").innerText())).toBe(plain(entry.title));
    await expect(page.locator(".ship-log-entry__body > p").first()).toBeVisible();
    await expect(page.locator(".ship-log-entry__actions a")).toHaveAttribute("href", /https:\/\/t\.me\//);
    if (mobileHomeEntries[0].id === entry.id) {
      const { product } = resolveHomeProduct(entry);
      await page.goto(`${baseURL}?audit=editorial-mobile-static`);
      await expect(page.locator('.afisha__print[data-position="0"]')).toHaveAttribute("data-journal-id", String(entry.id));
      expect(new URL(await page.locator(".afisha__frame").getAttribute("href"), page.url()).pathname).toBe("/catalog/");
      await page.locator(".afisha__order summary").click();
      for (const channel of await page.locator(".afisha__order-channels a").all()) {
        expect(plain(new URL(await channel.getAttribute("href")).searchParams.get("text"))).toContain(plain(product.name));
      }
    }
    await context.close();
  });
}
