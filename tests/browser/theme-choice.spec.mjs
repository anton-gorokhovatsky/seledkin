import { test, expect } from "@playwright/test";

test.use({ timezoneId: "Pacific/Honolulu", reducedMotion: "reduce" });

const choice = (page, name) => page.getByRole("radio", { name, exact: true });
const openMenu = page => page.getByRole("button", { name: "Открыть меню", exact: true }).click();

test("returning to Auto restores Moscow schedule and its next boundary @theme", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-13T07:59:00Z") });
  await page.clock.pauseAt(new Date("2026-10-13T07:59:30Z"));
  await page.goto("");
  await openMenu(page);
  await expect(choice(page, "Авто")).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await choice(page, "Дневная").check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await choice(page, "Авто").check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => localStorage.getItem("seledkin-theme"))).toBeNull();
  await page.clock.fastForward(31_000);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(choice(page, "Авто")).toBeChecked();

  await choice(page, "Ночная").check();
  await page.clock.fastForward(3_600_000);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await choice(page, "Авто").check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.clock.fastForward(8 * 3_600_000);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(choice(page, "Авто")).toBeChecked();
});

test("watch choice persists, syncs between pages and remains one keyboard stop @theme", async ({ page, context }) => {
  await page.goto("");
  await openMenu(page);
  await choice(page, "Дневная").check();
  await page.keyboard.press("Escape");
  await page.goto("catalog/");
  await openMenu(page);
  await expect(choice(page, "Дневная")).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.getByRole("button", { name: "Закрыть меню", exact: true }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(choice(page, "Дневная")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(choice(page, "Ночная")).toBeChecked();
  await expect(choice(page, "Ночная")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Закрыть меню", exact: true })).toBeFocused();

  const other = await context.newPage();
  await other.goto("about/");
  await openMenu(other);
  await expect(choice(other, "Ночная")).toBeChecked();
  await choice(other, "Авто").check();
  await expect(choice(page, "Авто")).toBeChecked();
  await page.reload();
  await openMenu(page);
  await expect(choice(page, "Авто")).toBeChecked();
  await other.close();
});

test("watch still changes when preference storage is unavailable @theme", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-13T09:00:00Z"));
  await page.addInitScript(() => {
    for (const method of ["getItem", "setItem", "removeItem"]) {
      Storage.prototype[method] = () => { throw new DOMException("Blocked", "SecurityError"); };
    }
  });
  await page.goto("");
  await openMenu(page);
  await choice(page, "Ночная").check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await choice(page, "Авто").check();
  await expect(choice(page, "Авто")).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
