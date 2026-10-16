import { editorialPath, recipeForEntry } from "../scripts/recipe-content.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { entries, journalEntries, renderJournal, renderMenu, renderFooter, renderTheme, renderJournalPage } from "../scripts/site-content.mjs";
import { isSocialTagRow } from "./helpers/editorial-prose.mjs";

test("committed shared regions are current and building twice is unnecessary", () => {
  // The check regenerates every shared region in memory and compares exact bytes.
  execFileSync(process.execPath, ["scripts/build-site.mjs", "--check"]);
  for (const path of ["index.html", "catalog/index.html", "about/index.html", "journal/index.html", "404.html", ...entries.map(entry => `${editorialPath(entry.id)}index.html`)]) {
    assert.match(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), /href="(?:\.\.\/)*assets\/styles\.css"/,
      "asset versions are assigned to the publication rather than edited by hand");
  }
});

test("every page initializes analytics once through the guarded shared module", () => {
  for (const path of ["index.html", "catalog/index.html", "about/index.html", "journal/index.html", "404.html", ...entries.map(entry => `${editorialPath(entry.id)}index.html`)]) {
    const html = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    assert.equal((html.match(/src="[^"]*assets\/analytics\.js"/g) ?? []).length, 1, path);
    assert.ok(!html.includes("mc.yandex.ru"), `Unconditional counter in ${path}`);
  }
});

test("one journal edit propagates to all views without shortening its prose", () => {
  assert.equal(new Set(entries.map(entry => entry.id)).size, entries.length);
  const changed = { ...journalEntries[0], title: "Проверка общего заголовка", product: "Проверка продукта" };
  for (const view of ["hero", "preview", "archive", "search"]) {
    const html = renderJournal([changed], view);
    assert.ok(html.includes(changed.title));
    assert.ok(html.includes(`${changed.id}/`));
    assert.ok(html.includes(changed.image));
  }
  const archive = renderJournal([changed], "article");
  for (const line of changed.body.split("\n").filter(line => !isSocialTagRow(line) && !line.includes('class="journal-source-signature"'))) assert.ok(archive.includes(line));
  assert.ok(decodeURIComponent(archive).includes(changed.product));
});

test("shared navigation keeps page-specific routes and the same contact information", () => {
  for (const [page, root] of [["home", ""], ["catalog", "../"], ["about", "../"], ["journal", "../"]]) {
    const menu = renderMenu(page, root);
    const footer = renderFooter(page, root);
    assert.ok(menu.includes(`href="${root}#contacts"`));
    assert.ok(footer.includes(`href="${root}catalog/"`));
    assert.ok(menu.includes("data-menu-close"));
    assert.ok([menu, footer].every(html =>
      html.replace(/&shy;|\u00ad/g, "").includes("Университет")));
    assert.equal((menu.match(/aria-current="page"/g) ?? []).length, page === "home" ? 0 : 1);
  }
  assert.ok(renderTheme("404").includes("base.href"));
  assert.ok(renderTheme("home").includes("posterPreload"));
  assert.ok(!renderTheme("catalog").includes("posterPreload"));
});

test("every story is shareable and preserves author text outside approved old contact tails and social tag rows", () => {
  for (const entry of entries) {
    const page = renderJournalPage(entry);
    assert.ok(page.includes(`rel="canonical" href="https://ks.fish/${editorialPath(entry.id)}"`));
    assert.ok(page.includes(`property="og:image" content="https://ks.fish/assets/${entry.image}"`));
    assert.equal((page.match(/<h1\b/g) ?? []).length, 1);
    const lines = entry.body.split("\n");
    const contactStart = !!recipeForEntry(entry.id)
      ? lines.findIndex(line => /Заказы принимаются только|class="journal-historical-contacts"/.test(line)) : -1;
    const authorLines = contactStart < 0 ? lines : lines.slice(0, contactStart);
    for (const line of authorLines.filter(line => !isSocialTagRow(line) && !line.includes('class="journal-source-signature"'))) assert.ok(page.includes(line), `Lost author line in ${entry.id}`);
    if (contactStart >= 0) {
      assert.ok(!page.includes("Заказы принимаются только"), `Outdated ordering conditions in ${entry.id}`);
      assert.ok(!page.includes('class="journal-historical-contacts"'), `Outdated contact tail in ${entry.id}`);
      const source = (entry.source?.url ?? `https://t.me/kapitanseledkin/${entry.id}`).replaceAll("&", "&amp;");
      assert.ok(page.includes(`href="${source}"`), "The complete original stays linked");
    }
  }
});
