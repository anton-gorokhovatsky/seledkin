import { editorialPath, recipeForEntry } from "../scripts/recipe-content.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { entries, journalEntries, homeJournalEntries, mobileHomeEntries, selectHomeEntries, resolveHomeProduct, renderMobileHero, renderJournal, renderMenu, renderFooter, renderTheme, renderJournalPage } from "../scripts/site-content.mjs";
import { checkHomePreviews } from "../scripts/check-editorial-release.mjs";
import { isSocialTagRow } from "./helpers/editorial-prose.mjs";

test("every approved mobile candidate resolves to a current exact product and its source photo", () => {
  for (const entry of entries.filter(entry => entry.mobileHero.eligible)) {
    const { product } = resolveHomeProduct(entry);
    const html = renderMobileHero([entry]);
    assert.ok(product.price, String(entry.id));
    assert.ok(html.includes(`data-product-id="${product.id}"`), String(entry.id));
    assert.ok(html.includes(`data-source-image="assets/${entry.image}"`), String(entry.id));
  }
  const mixed = entries.find(entry => entry.catalogProductIds?.length > 1);
  assert.throws(() => resolveHomeProduct({ ...mixed, mobileHero: { eligible: true }, heroOrderName: "товар" }), /needs a current product/);
  const explicit = { ...mixed, mobileHero: { eligible: true, productId: mixed.catalogProductIds[1] }, heroOrderName: "товар" };
  assert.equal(resolveHomeProduct(explicit).product.id, mixed.catalogProductIds[1]);
});

test("both committed homepages use fresh source records according to their explicit scenarios", () => {
  assert.deepEqual(homeJournalEntries.map(entry => entry.id), journalEntries.slice(0, 5).map(entry => entry.id));
  assert.deepEqual(mobileHomeEntries.map(entry => entry.id), entries.filter(entry => entry.mobileHero.eligible).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map(entry => entry.id));
  const recipeEntry = entries.find(entry => recipeForEntry(entry.id));
  const promoted = selectHomeEntries(entries.map(entry => entry === recipeEntry ? { ...entry, date: "2099-01-01", mobileHero: { eligible: true, reason: "A suitable product photograph within a recipe" } } : entry));
  assert.equal(promoted.mobile[0].id, recipeEntry.id);
  assert.ok(!promoted.desktop.some(entry => entry.id === recipeEntry.id));
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  checkHomePreviews(html);
  const [first] = mobileHomeEntries;
  const stale = html.replace(`data-journal-id="${first.id}"`, 'data-journal-id="stale-mobile-record"');
  assert.throws(() => checkHomePreviews(stale), /Mobile homepage selection is stale/);
  const oldPhoto = html.replace(/(<!-- shared:mobile-hero:start -->[\s\S]*?data-source-image=")[^"]+/, '$1assets/stale-photo.jpg');
  assert.throws(() => checkHomePreviews(oldPhoto), /Mobile photo differs/);
  const future = { ...first, id: 99999 };
  assert.match(renderMobileHero([future]), /data-journal-id="99999"/);
  assert.match(renderJournal([future], "hero"), /data-entry-id="99999"/);
  assert.throws(() => renderMobileHero([{ ...future, catalogProductIds: [] }]), /needs a current product/);
  const desktopOnly = { ...future, date: "2099-01-01", mobileHero: { eligible: false, reason: "A shop story without a single product photograph" } };
  const selected = selectHomeEntries([desktopOnly, ...entries]);
  assert.equal(selected.desktop[0].id, future.id);
  assert.equal(selected.mobile[0].id, first.id);
  assert.throws(() => selectHomeEntries([{ ...future, mobileHero: undefined }]), /Review mobile homepage suitability/);
  const story = renderJournal([{ ...desktopOnly, editorialOnly: true, product: undefined, catalogProductIds: [], body: "<p>История лавки.</p>" }], "article");
  assert.ok(story.includes("Написать Олегу"));
  assert.ok(!story.includes("undefined"));
});

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
