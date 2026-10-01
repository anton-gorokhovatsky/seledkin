import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { entries, renderJournal, renderMenu, renderFooter, renderTheme, renderJournalPage } from "../scripts/site-content.mjs";

test("committed shared regions are current and building twice is unnecessary", () => {
  // The check regenerates every shared region in memory and compares exact bytes.
  execFileSync(process.execPath, ["scripts/build-site.mjs", "--check"]);
  const versions = ["index.html", "catalog/index.html", "about/index.html", "journal/index.html", "404.html", ...entries.map(entry => `journal/${entry.id}/index.html`)]
    .map(path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8").match(/styles\.css\?v=([^"\s]+)/)?.[1]);
  assert.ok(versions.every(Boolean));
  assert.equal(new Set(versions).size, 1);
});

test("one journal edit propagates to all views without shortening its body", () => {
  assert.equal(new Set(entries.map(entry => entry.id)).size, entries.length);
  const changed = { ...entries[0], title: "Проверка общего заголовка", product: "Проверка продукта" };
  for (const view of ["hero", "preview", "archive", "search"]) {
    const html = renderJournal([changed], view);
    assert.ok(html.includes(changed.title));
    assert.ok(html.includes(`${changed.id}/`));
    assert.ok(html.includes(changed.image));
  }
  const archive = renderJournal([changed], "article");
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

test("every story is independently shareable and preserves every source line", () => {
  for (const entry of entries) {
    const page = renderJournalPage(entry);
    assert.ok(page.includes(`rel="canonical" href="https://ks.fish/journal/${entry.id}/"`));
    assert.ok(page.includes(`property="og:image" content="https://ks.fish/assets/${entry.image}"`));
    assert.equal((page.match(/<h1\b/g) ?? []).length, 1);
    for (const line of entry.body.split("\n")) assert.ok(page.includes(line), `Lost line in ${entry.id}`);
  }
});
