import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { typographText } from "../assets/typography.js";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const guidance = JSON.parse(read("content/catalog-guidance.json"));
const sources = JSON.parse(read("content/oleg-sources.json"));
const html = read("catalog/index.html");
const normalized = value => value.replace(/<[^>]*>/g, " ").replace(/\s+/gu, " ").trim();

test("catalog guidance keeps Oleg's words beside the matching product and complete source", () => {
  for (const tip of guidance) {
    const article = html.match(new RegExp(`<article[^>]*id="product-${tip.product}"[\\s\\S]*?</article>`))?.[0];
    assert.ok(article, `Missing product ${tip.product}`);
    const source = tip.source && sources.textSources.find(source => source.id === tip.source);
    const path = source ? `content/sources/${source.sourceFile}` : `content/journal/${tip.entry}.html`;
    const href = (source?.url ?? `../journal/${tip.entry}/`).replaceAll("&", "&amp;");
    assert.ok(normalized(read(path)).includes(normalized(tip.quote)), `Altered quotation ${tip.entry ?? tip.source}`);
    assert.ok(article.includes(`<blockquote cite="${href}">${typographText(tip.quote)}</blockquote>`));
    assert.ok(article.includes(`href="${href}"`), `Missing complete source ${tip.entry ?? tip.source}`);
  }
});

test("audio topics are linked by product, without fabricated quotations or mixing packaging advice", () => {
  for (const audio of sources.audio) for (const id of audio.products) {
    const article = html.match(new RegExp(`<article[^>]*id="product-${id}"[\\s\\S]*?</article>`))?.[0];
    assert.ok(article.includes(`href="${audio.url}"`), `${id} misses ${audio.id}`);
    assert.ok(read("about/index.html").includes(`href="${audio.url}"`));
  }
  const cannedCrab = html.match(/<article[^>]*id="product-seafood-004"[\s\S]*?<\/article>/)[0];
  assert.match(cannedCrab, /Рыбные консервы/);
  const freshCrab = html.match(/<article[^>]*id="product-seafood-001"[\s\S]*?<\/article>/)[0];
  assert.doesNotMatch(freshCrab, /Рыбные консервы/);
});

test("preparation descriptions are expanded once instead of repeated as notes", () => {
  for (const id of ["smoked-mackerel", "prepared-fish-006", "prepared-fish-011"]) {
    const article = html.match(new RegExp(`<article[^>]*id="product-${id}"[\\s\\S]*?</article>`))[0];
    assert.equal((article.match(/<p>Потрошёная рыба без головы<\/p>/g) ?? []).length, 1);
    assert.doesNotMatch(article, /<p>ПБГ/);
  }
});

test("peeled shrimp guidance never describes the unpeeled product", () => {
  const peeled = html.match(/<article[^>]*id="product-seafood-014"[\s\S]*?<\/article>/)[0];
  const unpeeled = html.match(/<article[^>]*id="product-seafood-013"[\s\S]*?<\/article>/)[0];
  assert.match(peeled, /Глубоководная, очищенная, свежемороженая/);
  assert.match(peeled, /<blockquote cite="\.\.\/journal\/464\/">/);
  assert.doesNotMatch(unpeeled, /<blockquote cite="\.\.\/journal\/464\/">/);
});
