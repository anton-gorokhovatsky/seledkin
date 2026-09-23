import { test, expect } from "@playwright/test";

test("the shop's story introduces its owner, keeps whole photographs and follows one reading order", async ({ page }) => {
  for (const theme of ["light", "dark"]) {
    for (const [width, enlarged] of [[1440, false], [980, false], [390, false], [320, true]]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("about/");
      await page.evaluate(value => localStorage.setItem("seledkin-theme", value), theme);
      await page.reload();
      if (enlarged) await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
      await page.evaluate(() => document.fonts.ready);
      const story = await page.evaluate(async () => {
        const box = el => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, right: r.right, bottom: r.bottom };
        };
        const images = [...document.querySelectorAll("main img[data-source-image]")];
        await Promise.all(images.map(img => { img.loading = "eager"; return img.decode(); }));
        return {
          sections: [...document.querySelectorAll("main > section")].map(box),
          shell: box(document.querySelector(".about-overview > .source-shell")),
          photos: images.map(img => ({ ...box(img), ratio: img.width / img.height, sourceRatio: img.naturalWidth / img.naturalHeight, fit: getComputedStyle(img).objectFit })),
          chapters: [...document.querySelectorAll(".about-overview__chapter")].map(el => ({ text: box(el.querySelector(".about-overview__reason")), photo: box(el.querySelector("img")) })),
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      expect(story.sections).toHaveLength(4);
      for (let i = 1; i < story.sections.length; i += 1) {
        expect(story.sections[i].y).toBeGreaterThanOrEqual(story.sections[i - 1].bottom);
      }
      expect(story.photos).toHaveLength(6);
      for (const photo of story.photos) {
        expect(photo.x).toBeGreaterThanOrEqual(story.shell.x - 1);
        expect(photo.right).toBeLessThanOrEqual(story.shell.right + 1);
        expect(Math.abs(photo.width - story.photos[0].width)).toBeLessThan(1);
        expect(photo.ratio).toBeCloseTo(photo.sourceRatio, 2);
        expect(photo.fit).not.toBe("cover");
      }
      for (const chapter of story.chapters) {
        if (width < 980) expect(chapter.photo.y).toBeGreaterThan(chapter.text.bottom);
        else expect(Math.abs(chapter.photo.y - chapter.text.y)).toBeLessThan(1);
      }
      expect(story.overflow).toBe(false);
    }
  }
  await page.locator(".about-closing").getByRole("link", { name: "Каталог и цены" }).click();
  await expect(page).toHaveURL(/\/catalog\/$/);
});
