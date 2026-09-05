import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [home, about, journal, originals] = await Promise.all([
  read("index.html"), read("about/index.html"), read("journal/index.html"),
  read("tests/fixtures/editorial-paragraphs.json").then(JSON.parse),
]);
const plain = text => text.replace(/<[^>]*>/g, "")
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '\"')
  .replace(/[\s\u00a0\u202f]+/gu, " ").trim();

test("every original editorial paragraph survives on a standalone page", () => {
  const paragraphs = [...(about + journal).matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map(match => plain(match[1]));
  assert.equal(originals.length, 47);
  for (const paragraph of originals) assert.ok(paragraphs.includes(plain(paragraph)), `Lost author paragraph: ${paragraph.slice(0, 80)}`);
  assert.match(home, /href="about\/"/);
  assert.match(home, /href="journal\/"/);
  assert.doesNotMatch(home, /<article\s+class="ship-log-entry/);
});

test("all journal entries retain their source and a draft about that exact product", () => {
  const names = ["Икряная камбала", "Филе сельди", "тугунок", "Икра дикого кижуча", "барабуля"];
  const entries = [...journal.matchAll(/<article\s+class="ship-log-entry[\s\S]*?<\/article>/g)].map(match => match[0]);
  assert.equal(entries.length, 5);
  entries.forEach((entry, index) => {
    const id = 684 - index;
    const inquiry = entry.match(/href="(https:\/\/t\.me\/\+79166751452\?text=[^"]+)"/)[1];
    const draft = new URL(inquiry).searchParams.get("text");
    assert.ok(draft.includes(names[index]));
    assert.ok(draft.includes(`https://t.me/kapitanseledkin/${id}`));
    assert.match(draft, /есть ли в наличии/);
    assert.doesNotMatch(draft, /[₽]|руб/);
    assert.ok(entry.includes(`href="https://t.me/kapitanseledkin/${id}"`));
  });
});
