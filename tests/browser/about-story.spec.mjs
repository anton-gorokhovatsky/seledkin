import { test, expect } from "@playwright/test";
import { olegSources, audioTime, audioFragmentHref } from "../../scripts/oleg-content.mjs";

const storyParts = [".about-overview", ".founder-source__inner", ".about-overview__reasons",
  ".founder-source__sources", ".founder-source__library", ".about-closing"];
const photos = ["flounder", "oleg-gugunava", "gallery-small-1", "about-small-1", "cutting-tuna", "quote-pan"];
const stressStyle = `html { font-size:200% !important; }
  * { line-height:1.5 !important; letter-spacing:.12em !important; word-spacing:.16em !important; }
  p { margin-bottom:2em !important; }`;

async function contextFor(browser, theme, width) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
  await context.route(/mc\.yandex|api\.mapbox/, route => route.abort());
  await context.addInitScript(value => localStorage.setItem("seledkin-theme", value), theme);
  return context;
}

async function readyPhotos(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.locator("main img").evaluateAll(images => Promise.all(images.map(image => {
    image.loading = "eager";
    return image.decode();
  })));
}

test("the selected story continues from Oleg to three reasons and the complete audio archive @about-story", async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(90000);
  for (const theme of ["light", "dark"]) {
    const context = await contextFor(browser, theme, 1440);
    const page = await context.newPage();
    for (const [width, enlarged] of [[1440, false], [390, false], [320, true]]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${baseURL}about/?audit=about-story`);
      if (enlarged) await page.addStyleTag({ content: stressStyle });
      await readyPhotos(page);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const layout = await page.evaluate(selectors => {
        const parts = selectors.map(selector => document.querySelector(selector));
        return {
          ordered: parts.slice(1).every((part, index) => parts[index].compareDocumentPosition(part) & Node.DOCUMENT_POSITION_FOLLOWING),
          boxes: parts.map(part => { const rect = part.getBoundingClientRect(); return { top: rect.top + scrollY, bottom: rect.bottom + scrollY }; }),
          photos: [...document.querySelectorAll("main img")].map(image => ({
            source: image.dataset.sourceImage,
            naturalRatio: image.naturalWidth / image.naturalHeight,
            visibleRatio: image.getBoundingClientRect().width / image.getBoundingClientRect().height,
            fit: getComputedStyle(image).objectFit,
          })),
          overflow: document.documentElement.scrollWidth - innerWidth,
        };
      }, storyParts);
      expect(layout.ordered).toBe(true);
      for (let index = 1; index < layout.boxes.length; index++) {
        expect(layout.boxes[index].top).toBeGreaterThanOrEqual(layout.boxes[index - 1].bottom - 1);
      }
      expect(layout.photos.map(photo => photo.source)).toEqual(photos.map(photo => `../assets/${photo}.jpg`));
      for (const photo of layout.photos) {
        expect(photo.visibleRatio).toBeCloseTo(photo.naturalRatio, 2);
        expect(photo.fit).not.toBe("cover");
      }
      expect(layout.overflow).toBeLessThanOrEqual(1);
      await expect(page.locator(".about-overview__chapter")).toHaveCount(3);
      await expect(page.locator(".about-overview__chapter h3")).toHaveText([
        "Во-первых, это качество", "Во-вторых, ассортимент", "И это наша третья фирменная фишка",
      ]);
      await expect(page.locator("main details")).toHaveCount(0);
      const library = page.locator(".founder-source__library");
      await expect(library.locator("li")).toHaveCount(8);
      await expect(library.locator(".founder-source__chapters a")).toHaveCount(18);
      for (const audio of olegSources.audio) {
        const episode = library.locator(`#audio-${audio.id}`);
        await expect(episode.locator("h4 a")).toHaveAttribute("href", audio.url);
        for (const [index, chapter] of audio.chapters.entries()) {
          const link = episode.locator(".founder-source__chapters a").nth(index);
          await expect(link).toHaveAttribute("href", audioFragmentHref(audio, chapter));
          await expect(link.locator(".source-caption")).toHaveText(audioTime(chapter.start));
        }
      }
      // The same end of the founder's text and the next scene remain comparable.
      await page.evaluate(() => window.scrollTo({ top: document.querySelector(".founder-source__inner").getBoundingClientRect().bottom + scrollY - 430, behavior: "instant" }));
      await page.screenshot({ path: testInfo.outputPath(`story-transition-${width}-${theme}${enlarged ? "-text200-spacing" : ""}.png`) });
      const firstChapter = library.locator(".founder-source__chapters a").first();
      await firstChapter.focus();
      await expect(firstChapter).toBeFocused();
      await expect(firstChapter).toBeInViewport();
      if (enlarged) {
        const times = await library.locator(".founder-source__chapters .source-caption").evaluateAll(items => items.map(item => ({ height: item.getBoundingClientRect().height, line: parseFloat(getComputedStyle(item).lineHeight) })));
        for (const time of times) expect(time.height).toBeLessThanOrEqual(time.line + 1);
        await page.screenshot({ path: testInfo.outputPath(`audio-focus-320-${theme}-text200-spacing.png`) });
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
    await context.close();
  }
});

test("audio timestamps stay keyboard reachable and internal catalog return keeps the reading position @about-story", async ({ browser, baseURL }, testInfo) => {
  for (const theme of ["light", "dark"]) {
    const context = await contextFor(browser, theme, 390);
    const audio = olegSources.audio[0], chapter = audio.chapters[0];
    const fragment = audioFragmentHref(audio, chapter);
    const visitedAudio = [];
    // Exercise the real link and history without a live SoundCloud request.
    await context.route("https://soundcloud.com/**", route => {
      if (route.request().isNavigationRequest()) visitedAudio.push(route.request().url());
      return route.fulfill({ contentType: "text/html", body: "<!doctype html><html lang=ru><title>Audio navigation fixture</title><p>Audio navigation fixture</p></html>" });
    });
    const page = await context.newPage();
    await page.goto(`${baseURL}about/?audit=about-story-return`);
    await readyPhotos(page);
    const link = page.locator(`#audio-${audio.id} .founder-source__chapters a`).first();
    await link.focus();
    await expect(link).toBeFocused();
    await expect(link).toBeInViewport();
    await link.press("Enter");
    await expect(page).toHaveURL(fragment);
    expect(visitedAudio).toEqual([audio.url]);
    await page.goBack();
    await expect(page).toHaveURL(/\/about\/\?audit=about-story-return$/);
    // A full cross-origin navigation does not restore activeElement in either
    // accepted order. Verify the returning link remains explicitly reachable.
    await link.focus();
    await expect(link).toBeFocused();
    await expect(link).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`audio-refocus-390-${theme}.png`) });
    const catalog = page.locator(".about-closing").getByRole("link", { name: "Каталог и цены", exact: true });
    await catalog.focus();
    // The preceding cross-origin Back created a fresh document. Settle the
    // focused scene before this baseline, just as after the internal return.
    await readyPhotos(page);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(catalog).toBeFocused();
    await expect(catalog).toBeInViewport();
    const beforeCatalog = await catalog.evaluate(link => ({ y: link.getBoundingClientRect().y, scroll: scrollY }));
    await catalog.press("Enter");
    await expect(page).toHaveURL(/\/catalog\/$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/about\/\?audit=about-story-return$/);
    await readyPhotos(page);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(catalog).toBeInViewport();
    const afterCatalog = await catalog.evaluate(link => ({ y: link.getBoundingClientRect().y, scroll: scrollY }));
    expect(Math.abs(afterCatalog.y - beforeCatalog.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(afterCatalog.scroll - beforeCatalog.scroll)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`catalog-return-context-390-${theme}.png`) });
    await catalog.focus();
    await expect(catalog).toBeFocused();
    await context.close();
  }
});
