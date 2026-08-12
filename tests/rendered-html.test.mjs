import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

test("exports the accepted product-first storefront as the home page", async () => {
  const html = await readFile(new URL("out/index.html", projectRoot), "utf8");

  assert.match(html, /<html lang="ru">/);
  assert.match(html, /Рыбная лавка/);
  assert.match(html, /капитана Селедкина/);
  assert.match(html, /Каталог и\s+цены/);
  assert.match(html, /Заказать в\s+Телеграме/);
  assert.match(html, /Нерка/);
  assert.match(html, /Гребешок/);
  assert.match(html, /Красная икра/);
  assert.match(html, /Сельдь слабосоленая/);
  assert.match(
    html,
    /Смотреть все\s*(?:<!-- -->)?114(?:<!-- -->)?\s*позиций/,
  );
  assert.ok(html.includes("Почему о\u00a0нас говорят?"));
  assert.match(html, /Олег Гугунава/);
  assert.match(html, /Судовой журнал/);
  assert.match(html, /Филе каспийского залома/);
  assert.match(html, /Выбрать, заказать, получить/);
  assert.match(html, /весь ассортимент и\s+действующие цены/);
  assert.doesNotMatch(html, /ориентировочные цены|актуальную цену|стоимость на/);
  assert.doesNotMatch(html, /Feed not found\.|id="novosti"|>Новости</);
  assert.doesNotMatch(html, /id="catalog"/);
  assert.match(html, /id="assortment"/);
  assert.match(html, new RegExp(`href="${basePath}/catalog/"`));
  assert.ok(html.includes("ул.\u00a0Строителей"));
  assert.ok(html.includes("д.\u00a07"));
  assert.ok(html.includes("+7\u00a0916\u00a0675\u201114\u201152"));
  assert.match(html, /метро\s+«Вавиловская»/);
  assert.match(html, /11:00—20:00/);
  assert.match(html, /harpoon-icon/);
  assert.match(html, /harpoon-icon__head/);
  assert.match(html, /harpoon-icon__rope/);
  assert.match(html, /sea-pattern__mark--purchase-desktop/);
  assert.match(html, /sea-pattern__mark--purchase-mobile/);
  assert.doesNotMatch(html, /↗|↓/);
  assert.match(html, /application\/ld\+json/);
  assert.doesNotMatch(html, /<video/);
  assert.doesNotMatch(html, /Открыть способы связи/);
  assert.match(html, new RegExp(`href="${basePath}/images/logo\\.png"`));
  assert.match(
    html,
    basePath
      ? /https:\/\/anton-gorokhovatsky\.github\.io\/seledkin\//
      : /https:\/\/ks\.fish\//,
  );
  assert.doesNotMatch(html, /<meta name="robots" content="noindex/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|SkeletonPreview/);
  assert.doesNotMatch(html, /qa-mobile/);
});

test("exports the full working catalog on its own page", async () => {
  const html = await readFile(
    new URL("out/catalog/index.html", projectRoot),
    "utf8",
  );

  assert.match(html, /<h1[^>]*>Каталог<\/h1>/);
  assert.match(html, /Полный ассортимент и\s+действующие цены/);
  assert.doesNotMatch(
    html,
    /ориентировочные цены|уточняйте актуальные цены|меняют цены ежедневно/,
  );
  assert.match(html, /type="search"/);
  assert.match(html, /Найти, например, нерку/);
  assert.match(html, /Уточнить наличие/);
  assert.doesNotMatch(html, /<dialog/);
  assert.match(html, /aria-live="polite"/);
  assert.ok(html.includes("15\u202f000\u00a0₽"), "expected typographed catalog prices");
  assert.match(html, new RegExp(`src="${basePath}/images/fish-school\\.svg"`));
  assert.match(html, new RegExp(`href="${basePath}/#assortment"`));
  assert.match(html, new RegExp(`href="${basePath}/#about"`));
  assert.match(html, new RegExp(`href="${basePath}/#order"`));
  assert.match(html, new RegExp(`href="${basePath}/#contacts"`));
  assert.doesNotMatch(
    html,
    /#chto-prodaem|#o-nas|#zakaz-i-dostavka|#kontakty/,
  );
  assert.match(html, /sea-pattern-field-catalog-hero/);
  assert.match(html, /sea-pattern-field-catalog-products/);
  assert.match(html, /Лосось, кот рыбной лавки/);
});

test("keeps the full migrated catalog in a dedicated data file", async () => {
  const source = await readFile(new URL("app/products.ts", projectRoot), "utf8");
  const itemCount = (source.match(/\bitem\(/g) ?? []).length;

  assert.ok(itemCount > 100, `expected more than 100 products, found ${itemCount}`);
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

test("exports the system-aware Night Shift theme and its accessible toggle", async () => {
  const html = await readFile(new URL("out/index.html", projectRoot), "utf8");
  const catalogHtml = await readFile(
    new URL("out/catalog/index.html", projectRoot),
    "utf8",
  );
  const css = await readFile(new URL("app/globals.css", projectRoot), "utf8");
  const conceptCss = await readFile(
    new URL("app/concept/concept.module.css", projectRoot),
    "utf8",
  );
  const layout = await readFile(new URL("app/layout.tsx", projectRoot), "utf8");
  const toggle = await readFile(
    new URL("app/theme-toggle.tsx", projectRoot),
    "utf8",
  );

  for (const page of [html, catalogHtml]) {
    assert.match(page, /Ночная смена/);
    assert.match(
      page,
      /aria-label="Ночная смена — включить тёмную тему"/,
    );
    assert.doesNotMatch(page, /<html[^>]+data-theme=/);
  }

  assert.match(css, /prefers-color-scheme:\s*dark/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /min-(?:width|height):\s*44px/);
  assert.match(conceptCss, /light-dark\(#f3efe4,\s*#071b24\)/);
  assert.match(layout, /seledkin-theme/);
  assert.match(toggle, /window\.localStorage\.setItem\(storageKey, theme\)/);
  assert.match(toggle, /window\.matchMedia\(darkThemeQuery\)/);
});

test("keeps ordering and contact routes complete without floating controls", async () => {
  const html = await readFile(new URL("out/index.html", projectRoot), "utf8");

  assert.match(html, /https:\/\/t\.me\/\+79166751452/);
  assert.match(html, /https:\/\/wa\.me\/79166751452/);
  assert.match(html, /tel:\+79166751452/);
  assert.match(html, /Открыть в\s+Яндекс Картах/);
  assert.doesNotMatch(html, /Открыть способы связи|contact-widget|contact-fab/);
  assert.doesNotMatch(html, /<video/);
});

test("keeps the new identity assets and the Losos footer", async () => {
  const html = await readFile(new URL("out/index.html", projectRoot), "utf8");
  const catalogHtml = await readFile(
    new URL("out/catalog/index.html", projectRoot),
    "utf8",
  );
  const css = await readFile(new URL("app/globals.css", projectRoot), "utf8");
  const conceptCss = await readFile(
    new URL("app/concept/concept.module.css", projectRoot),
    "utf8",
  );
  const seaPattern = await readFile(
    new URL("app/sea-pattern.tsx", projectRoot),
    "utf8",
  );

  assert.match(html, new RegExp(`src="${basePath}/images/logo-redrawn\\.svg"`));
  assert.match(catalogHtml, new RegExp(`src="${basePath}/images/fish-school\\.svg"`));
  assert.match(html, new RegExp(`src="${basePath}/images/salmon-cat\\.jpg"`));
  assert.match(
    html,
    new RegExp(`src="${basePath}/images/journal/caspian-zalom\\.jpg"`),
  );
  assert.match(html, /Лосось, кот рыбной лавки/);
  assert.match(html, /Ничего не\s*рекламирует, просто напоминает\./);
  assert.match(css, /--serif:\s*"Iowan Old Style"/);
  assert.match(css, /--sans:\s*"Golos Text"/);
  assert.match(css, /--pattern-gold:\s*#ffd700/);
  assert.match(
    css,
    /\.site-header__brand img\s*\{[^}]*mix-blend-mode:\s*screen/s,
  );
  assert.match(conceptCss, /--concept-yellow:\s*#ffd700/);
  assert.match(conceptCss, /\.order\s*\{[^}]*color:\s*var\(--concept-yellow\)/s);
  assert.match(seaPattern, /sea-pattern__mark/);
  assert.match(seaPattern, /markHalfWidth/);
  assert.match(seaPattern, /purchaseBandHeight\s*=\s*620/);
  assert.match(seaPattern, /makePurchaseMarksPath/);
  assert.match(seaPattern, /smoothWindow/);
  assert.match(seaPattern, /titleIsland/);
  assert.match(seaPattern, /kickerIsland/);
  assert.match(seaPattern, /topEnd/);
  assert.match(seaPattern, /bottomStart/);
  assert.match(conceptCss, /\.orderPoster\s*\{/);
  assert.match(conceptCss, /\.orderGrid\s*\{[^}]*padding-top:/s);
  assert.match(conceptCss, /prefers-reduced-motion:\s*reduce/);
});
