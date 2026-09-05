import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const base = new URL("https://example.com/seledkin/");
const paths = ["", "catalog/", "about/", "journal/"];
const pages = new Map(await Promise.all(paths.map(async path => [path, await readFile(new URL(`../${path}index.html`, import.meta.url), "utf8")])));
const routes = [
  ["Что продаём", "#assortment"],
  ["Продукты и цены", "catalog/"],
  ["Доставка", "#delivery"],
  ["Контакты", "#contacts"],
  ["О нас", "about/"],
  ["Судовой журнал", "journal/"],
];
const plain = text => text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

test("every menu label leads to the promised section from every page", () => {
  for (const [path, html] of pages) {
    const nav = html.match(/<nav aria-label="Меню сайта">([\s\S]*?)<\/nav>/)[1];
    const links = [...nav.matchAll(/<a\s+([^>]+)>([\s\S]*?)<\/a>/g)];
    assert.equal(links.length, routes.length);
    links.forEach(([_, attributes, content], index) => {
      const [label, route] = routes[index];
      assert.equal(plain(content.replace(/<span aria-hidden="true">[\s\S]*?<\/span>/, "")), label);
      const destination = new URL(attributes.match(/href="([^"]+)"/)[1], new URL(path, base));
      assert.equal(destination.href, new URL(route, base).href, `${path}: ${label}`);
      assert.equal(attributes.includes('aria-current="page"'), path !== "" && route === path, `${path}: incorrect current page on ${label}`);
    });
  }
});

test("local page links resolve to existing pages and fragments", () => {
  const documents = new Map([...pages].map(([path, html]) => [new URL(path, base).pathname, html]));
  for (const [path, html] of pages) {
    for (const [, href] of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
      const url = new URL(href.replaceAll("&amp;", "&"), new URL(path, base));
      if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) continue;
      const target = documents.get(url.pathname.replace(/index\.html$/, ""));
      assert.ok(target, `${path}: missing page ${href}`);
      if (url.hash) assert.ok(target.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `${path}: missing fragment ${href}`);
    }
  }
});

test("editorial skip links name the content they actually open", () => {
  assert.match(pages.get("about/"), /class="skip-link" href="#main">Перейти к истории лавки</);
  assert.match(pages.get("journal/"), /class="skip-link" href="#main">Перейти к журналу</);
});
