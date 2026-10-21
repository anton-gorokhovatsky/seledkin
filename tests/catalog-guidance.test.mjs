import { editorialPath, recipeForEntry } from "../scripts/recipe-content.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { typographText } from "../assets/typography.js";
import { audioFragmentHref, audioTime } from "../scripts/oleg-content.mjs";
import { catalog } from "../assets/catalog-data.js";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const guidance = JSON.parse(read("content/catalog-guidance.json"));
const sources = JSON.parse(read("content/oleg-sources.json"));
const html = read("catalog/index.html");
const normalized = value => value.replace(/<[^>]*>/g, " ").replace(/\s+/gu, " ").trim();
const published = new Set(catalog.flatMap(category => category.items.map(product => product.id)));

test("catalog guidance keeps Oleg's words beside the matching product and complete source", () => {
  for (const tip of guidance) {
    const article = html.match(new RegExp(`<article[^>]*id="product-${tip.product}"[\\s\\S]*?</article>`))?.[0];
    const source = tip.source && sources.textSources.find(source => source.id === tip.source);
    const path = source ? `content/sources/${source.sourceFile}` : `content/journal/${tip.entry}.html`;
    const href = (source?.url ?? `../${editorialPath(tip.entry)}`).replaceAll("&", "&amp;");
    assert.ok(normalized(read(path)).includes(normalized(tip.quote)), `Altered quotation ${tip.entry ?? tip.source}`);
    if (!published.has(tip.product)) {
      assert.equal(article, undefined, `Unlisted product must not have a selling card: ${tip.product}`);
      continue;
    }
    assert.ok(article, `Missing product ${tip.product}`);
    assert.ok(article.includes(`<blockquote cite="${href}"`));
    assert.ok(article.includes(`>${typographText(tip.quote)}</blockquote>`));
    if (source) assert.ok(article.includes(`data-source-date="${source.date}"`));
    const local = source?.entry ? `../${editorialPath(source.entry)}` : tip.entry ? href : null;
    if (local) assert.ok(article.includes(`href="${local}"`), `Missing on-site material ${tip.entry ?? tip.source}`);
  }
});

test("audio excerpts retain their selected words and time without mixing packaging advice", () => {
  for (const audio of sources.audio) {
    assert.equal(audio.reviewed, "full-transcript-and-selected-segment-crosscheck");
    assert.ok(read("about/index.html").includes(`href="${audio.url}"`));
    for (const chapter of audio.chapters) {
      const href = audioFragmentHref(audio, chapter);
      assert.equal(decodeURIComponent(new URL(href).hash.slice(3)), audioTime(chapter.start));
      assert.ok(read("about/index.html").includes(`href="${href}"`));
      for (const id of chapter.products) {
        const article = html.match(new RegExp(`<article[^>]*id="product-${id}"[\\s\\S]*?</article>`))?.[0];
        if (!published.has(id)) { assert.equal(article, undefined); continue; }
        if (chapter.catalog === false) assert.ok(!article.includes(`data-audio-chapter="${chapter.id}"`));
        if (article.includes(`data-audio-chapter="${chapter.id}"`)) {
          const quoteHref = audioFragmentHref(audio, { start: chapter.quoteStart });
          assert.ok(article.includes(`cite="${quoteHref}"`));
          assert.ok(article.includes(typographText(chapter.catalogQuote)));
          assert.doesNotMatch(article, /class="catalog-audio-note"/);
        }
      }
    }
  }
  const cannedCrab = html.match(/<article[^>]*id="product-seafood-004"[\s\S]*?<\/article>/)[0];
  assert.doesNotMatch(cannedCrab, /catalog-product-advice/);
  const freshCrab = html.match(/<article[^>]*id="product-seafood-001"[\s\S]*?<\/article>/)[0];
  assert.doesNotMatch(freshCrab, /data-audio-chapter="canned-choice"/);
  const cannedTongues = html.match(/<article[^>]*id="product-prepared-fish-013"[\s\S]*?<\/article>/)[0];
  assert.doesNotMatch(cannedTongues, /liver-tongues|#t=17%3A30/);
  const pate = html.match(/<article[^>]*id="product-other-007"[\s\S]*?<\/article>/)[0];
  assert.match(pate, /Обычно мы не\s+советуем покупать такую, но\s+именно эту/);
  assert.match(pate, /data-source-date="2023-10-20"/);
});

test("catalog advice serves the advice and on-site reading without source footnotes", () => {
  for (const advice of html.matchAll(/<div class="catalog-product-advice">([\s\S]*?)<\/div>/g)) {
    assert.doesNotMatch(advice[1], /<a[^>]+href="https?:/);
    assert.doesNotMatch(advice[1], /<time\b|SoundCloud|YouTube/);
  }
  assert.match(html, /href="\.\.\/recipes\/619\/"/);
  assert.ok(read("recipes/619/index.html").includes('href="https://t.me/kapitanseledkin/619"'));
});

test("preparation descriptions are expanded once instead of repeated as notes", () => {
  for (const id of ["smoked-mackerel", "prepared-fish-011"]) {
    const article = html.match(new RegExp(`<article[^>]*id="product-${id}"[\\s\\S]*?</article>`))[0];
    assert.equal((article.match(/<p>Потрошёная рыба без головы<\/p>/g) ?? []).length, 1);
    assert.doesNotMatch(article, /<p>ПБГ/);
  }
});

test("peeled shrimp guidance never describes the unpeeled product", () => {
  const peeled = html.match(/<article[^>]*id="product-seafood-014"[\s\S]*?<\/article>/)[0];
  const unpeeled = html.match(/<article[^>]*id="product-seafood-013"[\s\S]*?<\/article>/)[0];
  assert.match(peeled, /Глубоководная, очищенная, свежемороженая/);
  assert.match(peeled, /<blockquote cite="\.\.\/recipes\/464\/">/);
  assert.doesNotMatch(unpeeled, /<blockquote cite="\.\.\/recipes\/464\/">/);
});
