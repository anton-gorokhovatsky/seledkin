import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { entries, renderJournal, renderMenu, renderFooter, renderTheme } from "../scripts/site-content.mjs";

test("committed shared regions are current and building twice is unnecessary", () => {
  // The check regenerates every shared region in memory and compares exact bytes.
  execFileSync(process.execPath, ["scripts/build-site.mjs", "--check"]);
  const versions = ["index.html", "catalog/index.html", "about/index.html", "journal/index.html", "404.html"]
    .map(path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8").match(/styles\.css\?v=([^"\s]+)/)?.[1]);
  assert.ok(versions.every(Boolean));
  assert.equal(new Set(versions).size, 1);
});

test("one journal edit propagates to all three views without shortening its body", () => {
  assert.equal(new Set(entries.map(entry => entry.id)).size, entries.length);
  const changed = { ...entries[0], title: "Проверка общего заголовка", product: "Проверка продукта" };
  for (const view of ["hero", "preview", "archive"]) {
    const html = renderJournal([changed], view);
    assert.ok(html.includes(changed.title));
    assert.ok(html.includes(`journal-entry-${changed.id}`));
    assert.ok(html.includes(changed.image));
  }
  const archive = renderJournal([changed], "archive");
  for (const line of changed.body.split("\n")) assert.ok(archive.includes(line));
  assert.ok(decodeURIComponent(archive).includes(changed.product));
});

test("shared navigation keeps page-specific routes and the same contact information", () => {
  for (const [page, root] of [["home", ""], ["catalog", "../"], ["about", "../"], ["journal", "../"]]) {
    const menu = renderMenu(page, root);
    const footer = renderFooter(page, root);
    assert.ok(menu.includes(`href="${root}#contacts"`));
    assert.ok(footer.includes(`href="${root}catalog/"`));
    assert.ok(menu.includes("data-menu-close"));
    assert.ok(menu.includes("Университет") && footer.includes("Университет"));
    assert.equal((menu.match(/aria-current="page"/g) ?? []).length, page === "home" ? 0 : 1);
  }
  assert.ok(renderTheme("404").includes("base.href"));
  assert.ok(renderTheme("home").includes("posterPreload"));
  assert.ok(!renderTheme("catalog").includes("posterPreload"));
});
