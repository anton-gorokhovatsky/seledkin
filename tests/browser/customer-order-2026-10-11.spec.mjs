import { test, expect } from "@playwright/test";

test("retired packages cannot change a saved order and loose products accept weight at a portion price @catalog", async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("seledkin-order-item:other-017")) {
      localStorage.setItem("seledkin-order-format", "2");
      localStorage.setItem("seledkin-order-item:other-017", JSON.stringify({ amount: "2", addedAt: 1 }));
    }
  });
  await page.goto("catalog/?product=anchovy-fillet-in-oil&audit=order-unit");
  const list = page.locator("#order-list");
  await expect(list.locator("li")).toHaveCount(0);
  await page.locator('#product-anchovy-fillet-in-oil [data-order-add]').click();
  const weight = list.getByRole("textbox", { name: /^Вес.*Филе анчоуса/ });
  await expect(weight).toHaveValue("");
  await weight.fill("0,1");
  await page.reload();
  await expect(weight).toHaveValue("0,1");
  const draft = new URL(await list.getByRole("link", { name: "Открыть список в WhatsApp" }).getAttribute("href")).searchParams.get("text");
  expect(draft).toContain("Вес: 0,1 кг");
  expect(draft).toContain("1 500 ₽ за 100 г");
  expect(draft).not.toContain("Перец халапеньо");
  expect(draft).not.toContain("Количество:");
});

test("delivery, menu and footer continue the saved order before messenger handoff @catalog", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("seledkin-order-list", JSON.stringify(["caviar-001"]));
    localStorage.setItem("seledkin-order-amounts", JSON.stringify({ "caviar-001": "2" }));
  });
  await page.goto("?audit=order-continuation#delivery");
  for (const scope of [".delivery-source__actions", ".site-menu__service", ".source-footer__actions"]) {
    const links = page.locator(`${scope} a[href*="channel="]`);
    await expect(links).toHaveCount(2);
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute("href", /catalog\/\?channel=(telegram|whatsapp)#order-list$/);
      await expect(link).toContainText("Продолжить");
    }
  }
  await page.locator('.delivery-source__actions a[href*="channel=telegram"]').click();
  await expect(page.locator("#order-list")).toBeFocused();
  await expect(page.locator("#order-list").getByRole("textbox", { name: /^Количество.*Черная икра/ })).toHaveValue("2");
  await page.locator("#order-list").getByRole("button", { name: /^Убрать/ }).click();
  await expect(page.locator('.source-footer__actions a[href="https://t.me/+79166751452"]')).toHaveText("Заказать в Телеграме");
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("?audit=order-continuation");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.locator(".source-footer__channels").screenshot({ path: testInfo.outputPath("footer-socials-320.png") });
});

test("footer icons stay centered beside their labels in both watches", async ({ page }) => {
  for (const theme of ["light", "dark"]) for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("?audit=footer-icons");
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
    const gaps = await page.locator(".source-footer__channels a").evaluateAll(links => links.map(link => {
      const icon = link.querySelector("svg").getBoundingClientRect();
      const label = link.querySelector("span").getBoundingClientRect();
      return Math.abs(icon.y + icon.height / 2 - label.y - label.height / 2);
    }));
    for (const gap of gaps) expect(gap).toBeLessThan(1);
  }
});

test("equal order channels keep the same appearance in delivery, catalog, menu and footer", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const theme of ["light", "dark"]) {
    await page.addInitScript(theme => localStorage.setItem("seledkin-theme", theme), theme);
    await page.goto("?audit=shared-order-buttons#delivery");
    const styles = selector => page.locator(selector).evaluateAll(buttons => buttons.map(button => {
      const style = getComputedStyle(button);
      return Object.fromEntries(["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "padding", "borderRadius", "backgroundColor", "color"].map(name => [name, style[name]]));
    }));
    const delivery = await styles(".delivery-source__actions .source-button:not([href^='tel:'])");
    expect(delivery).toHaveLength(2);
    expect(delivery[0]).toEqual(delivery[1]);
    const phone = page.locator('.delivery-source__actions a[href="tel:+79166751452"]');
    await expect(phone).toHaveText("Позвонить");
    await expect(phone).toHaveAccessibleName("Позвонить в лавку: +7 916 675‑14‑52");
    expect(await styles('.delivery-source__actions a[href^="tel:"]')).toEqual(await styles('.source-footer__actions a[href^="tel:"]'));
    const layout = await page.locator(".delivery-waybill__copy").evaluate(copy => ({
      terms: [...copy.querySelectorAll(".delivery-source__lead, .delivery-waybill__charge, .delivery-source__terms")].map(term => term.getBoundingClientRect().left),
      buttons: [...copy.querySelectorAll(".source-button")].map(button => button.getBoundingClientRect().toJSON()),
    }));
    expect(layout.terms).toHaveLength(3);
    for (const left of layout.terms) expect(Math.abs(left - layout.buttons[0].left)).toBeLessThan(1);
    for (const button of layout.buttons) expect(Math.abs(button.top - layout.buttons[0].top)).toBeLessThan(1);
    expect(await styles(".source-footer__actions .source-button:not([href^='tel:'])")).toEqual(delivery);
    await page.getByRole("button", { name: "Открыть меню", exact: true }).click();
    expect(await styles(".site-menu__actions .source-button:not([href^='tel:'])")).toEqual(delivery);
    expect(await styles('.site-menu__actions a[href^="tel:"]')).toEqual(await styles('.delivery-source__actions a[href^="tel:"]'));
    await page.getByRole("button", { name: "Закрыть меню", exact: true }).click();
    if (theme === "dark") await page.locator("#delivery").screenshot({ path: testInfo.outputPath("delivery-common-buttons-dark.png") });
    await page.goto("catalog/?audit=shared-order-buttons");
    expect(await styles(".catalog-order-actions .source-button")).toEqual(delivery);
  }
});

test("cod's two scenes keep full photographs beside their own author text @journal", async ({ page }, testInfo) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("recipes/692/?audit=recipe-sequence");
    const geometry = await page.evaluate(() => {
      const scenes = [...document.querySelectorAll(".journal-story__scene")];
      const photos = scenes.map(scene => scene.querySelector("img").getBoundingClientRect());
      return { width: photos[0].width - photos[1].width, left: photos[0].left - photos[1].left,
        text: scenes.map(scene => scene.querySelector(".ship-log-entry__body").textContent),
        pictures: scenes.map(scene => { const img = scene.querySelector("img"); return { fit: getComputedStyle(img).objectFit, ratio: img.width / img.height, original: img.naturalWidth / img.naturalHeight }; }),
        grouped: scenes.map((scene, i) => { const copy = scene.querySelector(".ship-log-entry__content").getBoundingClientRect(); return innerWidth > 980 ? Math.abs(copy.top - photos[i].top) < 2 : copy.top > photos[i].bottom; }) };
    });
    expect(Math.abs(geometry.width)).toBeLessThan(1);
    expect(Math.abs(geometry.left)).toBeLessThan(1);
    expect(geometry.text[0]).toContain("судовой заморозки");
    expect(geometry.text[1]).toContain("Просто немного прогреть");
    expect(geometry.grouped).toEqual([true, true]);
    for (const picture of geometry.pictures) {
      expect(picture.fit).not.toBe("cover");
      expect(picture.ratio).toBeCloseTo(picture.original, 2);
    }
    expect(await page.locator(".journal-story__scene").last().locator(".recipe-current").count()).toBe(1);
    if (width === 1440) await page.locator(".journal-story__scene").first().screenshot({ path: testInfo.outputPath("cod-source-1440.png") });
  }
});

test("editorial recipe photos and titles open the complete source without a contact tail @recipes", async ({ page }) => {
  await page.goto("recipes/?audit=recipe-links");
  const features = page.locator(".recipe-editorial-opening article");
  await expect(features).toHaveCount(3);
  for (const feature of await features.all()) {
    const photo = feature.locator("figure a"), title = feature.locator("h2 a");
    expect(await photo.getAttribute("href")).toBe(await title.getAttribute("href"));
    await expect(photo).toHaveAttribute("href", /recipes\/\d+\/$/);
  }
  await features.nth(0).locator("h2 a").press("Enter");
  await expect(page.locator(".ship-log-entry__body")).toContainText(/Натрите\s+на\s+крупной\s+терке\s+вареное\s+яйцо/);
  await expect(page.locator(".ship-log-entry__body")).not.toContainText("Строителей");
  await expect(page.getByRole("link", { name: "Из телеграм-канала", exact: true })).toBeVisible();
});
