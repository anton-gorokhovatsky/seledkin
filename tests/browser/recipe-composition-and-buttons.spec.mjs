import { test, expect } from "@playwright/test";

test("ordinary action buttons keep their visible side insets across page layouts", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const route of ["?audit=button-insets", "catalog/?audit=button-insets", "recipes/?ingredient=roe&audit=button-insets", "about/?audit=button-insets", "journal/692/?audit=button-insets", "404.html?audit=button-insets"]) {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    async function checkInsets() {
      const insets = await page.locator(".source-button:visible").evaluateAll(buttons => buttons.map(button => {
        const walker = document.createTreeWalker(button.querySelector(".source-button__label") || button, NodeFilter.SHOW_TEXT);
        const boxes = [];
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (!node.textContent.trim() || node.parentElement.closest(".visually-hidden, [hidden], [aria-hidden='true']")) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          boxes.push(...range.getClientRects());
        }
        const content = { left: Math.min(...boxes.map(box => box.left)), right: Math.max(...boxes.map(box => box.right)) };
        const box = button.getBoundingClientRect();
        const css = getComputedStyle(button);
        return { label: button.textContent.trim(), left: content.left - box.left, right: box.right - content.right,
          expectedLeft: parseFloat(css.paddingLeft) + parseFloat(css.borderLeftWidth),
          expectedRight: parseFloat(css.paddingRight) + parseFloat(css.borderRightWidth) };
      }));
      expect(insets.length).toBeGreaterThan(0);
      for (const inset of insets) {
        expect(inset.left, inset.label).toBeCloseTo(inset.expectedLeft, 0);
        expect(inset.right, inset.label).toBeCloseTo(inset.expectedRight, 0);
        expect(inset.expectedLeft, inset.label).toBeCloseTo(17, 0);
      }
    }
    await checkInsets();
    if (route.startsWith("?")) {
      await page.getByRole("button", { name: "Открыть меню", exact: true }).click();
      await checkInsets();
      await page.getByRole("button", { name: "Закрыть меню", exact: true }).click();
    }
  }
});

test("all twenty recipes and advice retain large photographs and authored text in every ingredient selection @recipes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("recipes/?audit=all-materials");
  await page.evaluate(() => document.fonts.ready);
  for (const [ingredient, count] of [["all", 20], ["fish", 11], ["mussels", 2], ["shrimp", 4], ["octopus", 1], ["roe", 1], ["pasta", 1]]) {
    await page.locator(`button[data-ingredient="${ingredient}"]`).press("Enter");
    const materials = page.locator("[data-recipe-feature]:visible, .recipe-record:visible");
    await expect(materials).toHaveCount(count);
    const details = await materials.evaluateAll(nodes => nodes.map(node => {
      const photo = node.querySelector("img"), title = node.querySelector("h2, h3");
      const quote = node.querySelector(".recipe-record-excerpt, .recipe-editorial-lead__note, .recipe-editorial-story__copy > p:not(.recipe-meta)");
      return { id: node.dataset.recipeMaterial || node.dataset.recipeFeature, photoWidth: photo.getBoundingClientRect().width,
        titleSize: parseFloat(getComputedStyle(title).fontSize), quote: quote?.textContent.trim(),
        photoHref: photo.closest("a").getAttribute("href"), titleHref: title.closest("a")?.getAttribute("href") || title.querySelector("a").getAttribute("href") };
    }));
    for (const detail of details) {
      expect(detail.photoWidth, detail.id).toBeGreaterThan(350);
      expect(detail.titleSize, detail.id).toBeGreaterThanOrEqual(60);
      expect(detail.quote?.length, detail.id).toBeGreaterThan(40);
      expect(detail.photoHref, detail.id).toBe(detail.titleHref);
    }
  }
});

test("a single recipe uses the full desktop spread and a complete narrow reading sequence @recipes", async ({ page }, testInfo) => {
  for (const width of [1512, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const ingredient of ["octopus", "roe", "pasta"]) {
      await page.goto(`recipes/?ingredient=${ingredient}&audit=single-spread`);
      await page.evaluate(() => document.fonts.ready);
      const article = page.locator("[data-recipe-feature]:visible, .recipe-record:visible");
      await expect(article).toHaveCount(1);
      const boxes = await article.evaluate(node => {
        const photo = node.querySelector("img"), copy = node.querySelector(".recipe-editorial-story__copy, .recipe-record-copy");
        return { article: node.getBoundingClientRect().toJSON(), photo: photo.getBoundingClientRect().toJSON(), copy: copy.getBoundingClientRect().toJSON(),
          ratio: Number(photo.getAttribute("width")) / Number(photo.getAttribute("height")) };
      });
      expect(boxes.photo.width / boxes.photo.height).toBeCloseTo(boxes.ratio, 2);
      if (width > 736) {
        expect(boxes.photo.width / boxes.article.width).toBeGreaterThan(.4);
        expect(boxes.copy.top).toBeCloseTo(boxes.photo.top, 0);
        expect(boxes.copy.left).toBeGreaterThan(boxes.photo.right);
        expect(boxes.copy.right).toBeCloseTo(boxes.article.right, 0);
      } else {
        expect(boxes.photo.width).toBeCloseTo(boxes.article.width, 0);
        expect(boxes.copy.top).toBeGreaterThan(boxes.photo.bottom);
        expect(boxes.copy.left).toBeCloseTo(boxes.photo.left, 0);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      if (width === 1512) await article.screenshot({ path: testInfo.outputPath(`${ingredient}-single-wide.png`) });
    }
  }
});
