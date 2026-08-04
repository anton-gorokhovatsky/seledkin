import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

test("exports the faithful Russian Tilda baseline", async () => {
  const html = await readFile(new URL("out/index.html", projectRoot), "utf8");

  assert.match(html, /<html lang="ru">/);
  assert.match(html, /Рыбная лавка/);
  assert.match(html, /капитана Селедкина/);
  assert.match(html, /Заказать в Telegram/);
  assert.match(html, /Красная икра премиум-качества/);
  assert.ok(html.includes("Почему о\u00a0нас говорят?"));
  assert.match(html, /Олег Гугунава/);
  assert.match(html, /Feed not found\./);
  assert.match(html, /Друзья!/);
  assert.match(html, /ул\. Строителей/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, new RegExp(`src="${basePath}/images/hero-ocean\\.jpg"`));
  assert.match(html, new RegExp(`href="${basePath}/images/logo\\.png"`));
  assert.match(
    html,
    basePath
      ? /https:\/\/anton-gorokhovatsky\.github\.io\/seledkin\//
      : /https:\/\/ks\.fish\//,
  );
  assert.match(html, /aria-live="polite"/);
  assert.ok(html.includes("15\u202f000\u00a0₽"), "expected typographed catalog prices");
  assert.doesNotMatch(html, /Найти, например/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|SkeletonPreview/);
  assert.doesNotMatch(html, /qa-mobile/);
});

test("keeps the full migrated catalog in a dedicated data file", async () => {
  const source = await readFile(new URL("app/products.ts", projectRoot), "utf8");
  const itemCount = (source.match(/\bitem\(/g) ?? []).length;

  assert.ok(itemCount > 100, `expected more than 100 products, found ${itemCount}`);
  assert.match(source, /catalogUpdated = "январь 2026"/);
  assert.match(source, /Свежемороженая рыба/);
  assert.match(source, /Сельдь слабосоленая/);
});

test("keeps the accessibility and motion gates in the stylesheet", async () => {
  const css = await readFile(new URL("app/globals.css", projectRoot), "utf8");

  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /text-wrap:\s*balance/);
  assert.match(css, /font-size:\s*clamp\(/);
});

test("restores the source hero video and complete contact widget", async () => {
  const heroVideo = await readFile(new URL("app/hero-video.tsx", projectRoot), "utf8");
  const contactWidget = await readFile(
    new URL("app/contact-widget.tsx", projectRoot),
    "utf8",
  );
  const page = await readFile(new URL("app/page.tsx", projectRoot), "utf8");

  assert.match(heroVideo, /AsD5u6k6dKI/);
  assert.match(heroVideo, /prefers-reduced-motion:\s*reduce/);
  assert.match(heroVideo, /min-width:\s*761px/);
  assert.match(contactWidget, /Открыть способы связи/);
  assert.match(contactWidget, /https:\/\/t\.me\/\+79166751452/);
  assert.match(contactWidget, /https:\/\/wa\.me\/79166751452/);
  assert.match(contactWidget, /tel:\+79166751452/);
  assert.match(page, /social-icon--soundcloud/);
});
