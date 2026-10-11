import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { typographText } from "../assets/typography.js";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const guidance = JSON.parse(read("content/catalog-guidance.json"));
const html = read("catalog/index.html");
const normalized = value => value.replace(/<[^>]*>/g, " ").replace(/\s+/gu, " ").trim();

test("catalog guidance keeps Oleg's words beside the matching product and complete source", () => {
  for (const tip of guidance) {
    const article = html.match(new RegExp(`<article[^>]*id="product-${tip.product}"[\\s\\S]*?</article>`))?.[0];
    assert.ok(article, `Missing product ${tip.product}`);
    assert.ok(normalized(read(`content/journal/${tip.entry}.html`)).includes(normalized(tip.quote)), `Altered quotation ${tip.entry}`);
    assert.ok(article.includes(`<blockquote cite="../journal/${tip.entry}/">${typographText(tip.quote)}</blockquote>`));
    assert.ok(article.includes(`href="../journal/${tip.entry}/"`), `Missing complete source ${tip.entry}`);
  }
});

test("peeled shrimp guidance never describes the unpeeled product", () => {
  const peeled = html.match(/<article[^>]*id="product-seafood-014"[\s\S]*?<\/article>/)[0];
  const unpeeled = html.match(/<article[^>]*id="product-seafood-013"[\s\S]*?<\/article>/)[0];
  assert.match(peeled, /Глубоководная, очищенная, свежемороженая/);
  assert.match(peeled, /<blockquote cite="\.\.\/journal\/464\/">/);
  assert.doesNotMatch(unpeeled, /<blockquote cite="\.\.\/journal\/464\/">/);
});
