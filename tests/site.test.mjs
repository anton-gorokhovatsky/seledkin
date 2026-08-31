import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { catalog } from "../assets/catalog-data.js";
import {
  effectiveTheme,
  millisecondsUntilThemeShift,
  normalizeTheme,
  scheduledTheme,
  storeCloseHour,
  storeOpenHour,
  storeTimeZone,
  themeStorageKey,
} from "../assets/theme.js";
import { typographPrice, typographText } from "../assets/typography.js";

const home = await readFile(new URL("../index.html", import.meta.url), "utf8");
const catalogPage = await readFile(
  new URL("../catalog/index.html", import.meta.url),
  "utf8",
);
const notFoundPage = await readFile(
  new URL("../404.html", import.meta.url),
  "utf8",
);
const accessibility = await readFile(
  new URL("../ACCESSIBILITY.md", import.meta.url),
  "utf8",
);
const projectRules = await readFile(
  new URL("../AGENTS.md", import.meta.url),
  "utf8",
);
const styles = await readFile(
  new URL("../assets/styles.css", import.meta.url),
  "utf8",
);
const siteScript = await readFile(
  new URL("../assets/site.js", import.meta.url),
  "utf8",
);
const themeScript = await readFile(
  new URL("../assets/theme.js", import.meta.url),
  "utf8",
);
const catalogScript = await readFile(
  new URL("../catalog/catalog.js", import.meta.url),
  "utf8",
);
const sourceLogo = await readFile(
  new URL("../assets/logo-redrawn.svg", import.meta.url),
  "utf8",
);
const squidLogo = await readFile(
  new URL("../assets/logo-catch-squid.svg", import.meta.url),
  "utf8",
);
const squidNightLogo = await readFile(
  new URL("../assets/logo-catch-squid-night.svg", import.meta.url),
  "utf8",
);
const favicon = await readFile(
  new URL("../assets/favicon.svg", import.meta.url),
  "utf8",
);
const faviconTemplate = await readFile(
  new URL("../scripts/logo-marks/favicon.svg", import.meta.url),
  "utf8",
);
const fishPattern = await readFile(
  new URL("../assets/fish-pattern.svg", import.meta.url),
  "utf8",
);
const logoBuilder = await readFile(
  new URL("../scripts/build-logo-variants.mjs", import.meta.url),
  "utf8",
);
const shareCard = await readFile(
  new URL("../assets/share-card-primary.jpg", import.meta.url),
);
const shareCardSource = await readFile(
  new URL("../assets/share-card-source.svg", import.meta.url),
  "utf8",
);
const nightSeaManifest = JSON.parse(
  await readFile(
    new URL("../assets/hero-sea-night.manifest.json", import.meta.url),
    "utf8",
  ),
);
const nightSeaProvenance = await readFile(
  new URL("../assets/hero-sea-night.provenance.md", import.meta.url),
  "utf8",
);

function relativeLuminance(hex) {
  const channels = hex
    .replace("#", "")
    .match(/../g)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    );

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground, background) {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function jpegDimensions(buffer) {
  for (const marker of [0xc0, 0xc1, 0xc2]) {
    const offset = buffer.indexOf(Buffer.from([0xff, marker]));
    if (offset < 0) continue;
    return {
      width: buffer.readUInt16BE(offset + 7),
      height: buffer.readUInt16BE(offset + 5),
    };
  }

  throw new Error("JPEG size marker not found");
}

test("the site is plain HTML, CSS and JavaScript", () => {
  assert.match(home, /^<!doctype html>/i);
  assert.match(catalogPage, /^<!doctype html>/i);
  assert.doesNotMatch(home + catalogPage + siteScript, /next\/|react-dom|hydrateRoot/i);
  assert.match(home, /assets\/styles\.css/);
  assert.match(catalogPage, /catalog\.js/);
});

test("one drawn harpoon marks every directional transition", () => {
  assert.match(home, /<symbol id="icon-harpoon" viewBox="0 0 32 18">/);
  assert.match(home, /M23 9H8\.5C4\.6 9 2\.5 10\.8 2\.5 13\.2/);
  assert.equal((home.match(/href="#icon-harpoon"/g) ?? []).length, 10);
  assert.doesNotMatch(home, /M2 8h20M16 2l6 6-6 6/);
  assert.match(
    styles,
    /\.assortment-directory__link:hover \.assortment-directory__label[\s\S]*?text-decoration-color:\s*currentcolor;[\s\S]*?translateX\(0\.35rem\)/,
  );
  assert.doesNotMatch(
    styles,
    /\.assortment-directory__link(?:[^,{]*)?(?:,|\s*\{)[^}]*box-shadow:/s,
  );
  assert.doesNotMatch(styles, /var\(--link\)/);
});

test("home assortment links directly to every catalog section", () => {
  const section =
    home.match(/<section\s+class="assortment-overview[\s\S]*?<\/section>/)?.[0] ?? "";

  assert.match(section, /id="assortment"/);
  assert.match(section, /id="assortment-title">Что продаём<\/h2>/);
  assert.match(section, /7 разделов · 114 позиций/);
  assert.doesNotMatch(section, />Весь каталог<\/span>/);

  for (const [slug, label, count] of [
    ["caviar", "Икра", 8],
    ["seafood", "Морепродукты", 20],
    ["frozen-fish", "Свежемороженая рыба", 35],
    ["fillet", "Филе", 7],
    ["steaks", "Рыбные стейки", 5],
    ["prepared-fish", "Слабосоленая и копченая рыба", 12],
    ["other", "Новинки и прочее", 27],
  ]) {
    assert.match(section, new RegExp(`href="catalog\\/#category-${slug}"`));
    assert.match(section, new RegExp(`>${label}<\\/span>`));
    assert.match(section, new RegExp(`>${count} позиций<\\/span>`));
  }

  assert.equal((section.match(/catalog\/#category-/g) ?? []).length, 7);
  assert.equal((section.match(/class="assortment-directory__link"/g) ?? []).length, 7);
  assert.doesNotMatch(section, /WhatsApp|Телеграм|opening-gallery|caviar-title/);
  assert.match(
    styles,
    /\.assortment-directory__list\s*\{[^}]*grid-template-columns:\s*1fr;/s,
  );
});

test("home about section keeps Oleg's evidence in three full-bleed editorial stories", () => {
  const section =
    home.match(/<section\s+class="about-overview[\s\S]*?<\/section>/)?.[0] ?? "";

  assert.match(section, /id="about"/);
  assert.match(section, /class="about-overview__eyebrow">О нас<\/p>/);
  assert.match(
    section,
    /id="about-title">\s*Ещё одно место в Москве, где продаётся хорошая рыба\s*<\/h2>/,
  );
  assert.match(section, /Почему о нас говорят\?/);
  assert.match(section, /Во-первых, это качество/);
  assert.match(section, /Во-вторых, ассортимент/);
  assert.match(section, /третья фирменная фишка/);
  assert.equal((section.match(/class="about-overview__reason"/g) ?? []).length, 3);
  assert.equal((section.match(/<article class="about-overview__chapter/g) ?? []).length, 3);
  assert.equal((section.match(/<h4>/g) ?? []).length, 3);
  assert.equal((section.match(/<figure /g) ?? []).length, 4);
  assert.match(section, /about-overview__chapter about-overview__chapter--reverse/);
  assert.doesNotMatch(section, /\bdata-about-story|aria-roledescription="карусель"/);
  assert.doesNotMatch(section, /about-overview__story-control|aria-live="polite"/);
  assert.doesNotMatch(section, /<(?:button|input|select|textarea)\b/);
  assert.match(
    styles,
    /\.about-overview__opening-media img,[\s\S]*?\.about-overview__chapter-media img[\s\S]*?height:\s*auto;/,
  );
  assert.doesNotMatch(
    styles,
    /\.about-overview__(?:opening|chapter)-media(?: img)?\s*\{[^}]*object-fit:/s,
  );
  assert.match(
    styles,
    /\.about-overview__story-stage\s*\{[^}]*width:\s*calc\(100% \+ \(2 \* var\(--content-edge\)\)\);[^}]*background:\s*var\(--footer\);/s,
  );
  assert.match(
    styles,
    /\.about-overview__chapter\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/s,
  );
  assert.match(
    styles,
    /@media \(max-width: 34rem\)[\s\S]*?\.about-overview__chapter\s*\{[^}]*grid-template-columns:\s*1fr;/s,
  );
  assert.match(
    styles,
    /\.about-overview__chapter--reverse \.about-overview__chapter-media\s*\{[^}]*grid-column:\s*2;/s,
  );
  assert.doesNotMatch(siteScript, /aboutStor(?:y|ies)/);
  for (const asset of [
    "flounder.jpg",
    "about-main.jpg",
    "about-small-2.jpg",
    "gallery-small-2.jpg",
  ]) {
    assert.match(section, new RegExp(`src="assets/${asset.replace(".", "\\.")}"`));
  }
  assert.doesNotMatch(section, /<h2>Икра<\/h2>|source-split|source-gallery|why-collage/);
});

test("home exposes the core customer jobs", () => {
  for (const id of ["assortment", "about", "delivery", "contacts"]) {
    assert.match(home, new RegExp(`id="${id}"`));
  }

  assert.match(home, /Продукты и цены/);
  assert.match(home, /Заказать в Телеграме/);
  const hero = home.match(/<section class="source-hero"[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.match(hero, /href="catalog\/"/);
  assert.match(hero, /href="https:\/\/t\.me\/\+79166751452"/);
  assert.match(hero, /class="[^"]*source-hero__proof/);
  assert.match(hero, /href="#journal-entry-682"/);
  assert.match(hero, /src="assets\/journal-682\.jpg"/);
  assert.match(hero, /datetime="2026-08-25"/);
  assert.match(hero, /У&nbsp;нас новый завоз царского малосольного тугунка/);
  assert.doesNotMatch(hero, /src="assets\/about-main\.jpg"/);
  assert.doesNotMatch(hero, /Из ассортимента лавки/);
  assert.match(home, /метро «Вавиловская»/);
  const contacts =
    home.match(/<section class="contacts-source"[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.match(contacts, /Метро\s+«Вавиловская»/);
  assert.doesNotMatch(contacts, /Университет/);
  assert.match(contacts, /Ежедневно с&nbsp;11:00 до&nbsp;20:00/);
  assert.doesNotMatch(home + styles, /source-hero__down/);
});

test("the hero uses a manual, accessible journal stack without autoplay", () => {
  const hero = home.match(/<section class="source-hero"[\s\S]*?<\/section>/)?.[0] ?? "";

  assert.match(hero, /data-hero-journal/);
  assert.match(hero, /aria-roledescription="карусель"/);
  assert.match(hero, /aria-describedby="hero-journal-instructions"/);
  assert.match(
    hero,
    /Переключайте записи кнопками или клавишами со стрелками влево и вправо\./,
  );
  assert.equal((hero.match(/data-hero-journal-card/g) ?? []).length, 3);
  for (const id of [682, 681, 680]) {
    assert.match(hero, new RegExp("href=\"#journal-entry-" + id + "\""));
    assert.match(hero, new RegExp("assets/journal-" + id + "\\.jpg"));
  }
  assert.doesNotMatch(hero, /https:\/\/t\.me\/kapitanseledkin\/68[012]/);

  assert.match(hero, /data-hero-journal-previous/);
  assert.match(hero, /data-hero-journal-next/);
  assert.match(hero, /data-hero-journal-all/);
  assert.match(hero, /href="#journal"/);
  assert.match(hero, /aria-label="Открыть весь Судовой журнал"/);
  assert.match(hero, />Весь журнал<\/span>/);
  assert.equal(
    (hero.match(/source-hero__journal-control(?:\s|")/g) ?? []).length,
    3,
  );
  assert.match(hero, /aria-live="polite"/);
  assert.match(styles, /\.source-hero__journal-stack\s*\{[\s\S]*?touch-action:\s*pan-y;/);
  assert.match(styles, /\.source-hero__journal-card\[aria-hidden="true"\] figcaption/);
  assert.doesNotMatch(styles, /\.source-hero__journal-card\[aria-hidden="true"\] figure/);
  assert.match(
    styles,
    /\.source-hero__journal-card\[data-stack-position="1"\][\s\S]*?rotate\(1\.2deg\)/,
  );
  assert.match(
    styles,
    /\.source-hero__journal-card\[data-stack-position="1"\][\s\S]*?opacity:\s*1;/,
  );
  assert.match(
    styles,
    /\.source-hero__journal-card\[data-stack-position="2"\][\s\S]*?opacity:\s*1;/,
  );
  assert.doesNotMatch(
    styles,
    /\.source-hero__journal-card\[data-stack-position="[12]"\][^}]*translate\([^,]+,[^)]+\)/s,
  );
  assert.doesNotMatch(styles, /data-stack-position\^="-"/);
  assert.match(styles, /\.source-hero\s*\{[\s\S]*?height:\s*100svh;/);
  assert.match(
    styles,
    /\.source-hero__copy\s*\{[^}]*min-height:\s*100dvh;/s,
  );
  assert.match(
    styles,
    /@media \(max-width: 61\.1875rem\)[\s\S]*?\.source-hero\s*\{[^}]*background-position:\s*50% bottom;[^}]*background-size:\s*auto 145%;/,
  );
  assert.match(
    styles,
    /\.source-hero__copy\s*\{[^}]*padding:\s*clamp\(20rem, 45dvh, 24rem\) 0 clamp\(3rem, 8dvh, 4\.5rem\);/s,
  );
  assert.match(
    styles,
    /\.source-hero__mobile-brand\s*\{[^}]*left:\s*50%;[^}]*width:\s*min\(82vw, 18rem\);[^}]*transform:\s*translateX\(-50%\);/s,
  );
  assert.match(
    styles,
    /\.source-hero__content p\s*\{[^}]*font-family:\s*var\(--serif\);[^}]*font-size:\s*clamp\(1\.95rem, 8\.4vw, 2\.4rem\);/s,
  );
  assert.match(
    styles,
    /\.source-hero__actions \.source-button--hero-secondary\s*\{[^}]*display:\s*none;/s,
  );
  assert.match(
    styles,
    /\.source-hero__journal\s*\{[^}]*min-height:\s*100dvh;/s,
  );
  assert.match(
    styles,
    /@media \(max-width: 61\.1875rem\)[\s\S]*?\.source-hero__journal-stack\s*\{[^}]*width:\s*100%;[^}]*min-width:\s*0;[^}]*margin-inline:\s*auto;[^}]*padding:\s*0 12px 12px 0;/,
  );
  assert.doesNotMatch(
    styles,
    /\.source-hero__journal-stack\s*\{[^}]*width:\s*min\(74vw, 18rem\);/,
  );
  const heroFigure =
    styles.match(/\.source-hero__proof figure\s*\{([^}]*)\}/s)?.[1] ?? "";
  const heroCaption =
    styles.match(/\.source-hero__proof figcaption\s*\{([^}]*)\}/s)?.[1] ?? "";
  const heroControl =
    styles.match(/\.source-hero__journal-control\s*\{([^}]*)\}/s)?.[1] ?? "";
  assert.doesNotMatch(heroFigure, /background|backdrop-filter|box-shadow/);
  assert.doesNotMatch(
    heroCaption,
    /background|backdrop-filter|box-shadow|border:|position:\s*absolute/,
  );
  assert.match(
    styles,
    /\.source-hero__proof img\s*\{[^}]*aspect-ratio:\s*647\s*\/\s*800;[^}]*object-fit:\s*contain;/s,
  );
  const heroImage =
    styles.match(/\.source-hero__proof img\s*\{([^}]*)\}/s)?.[1] ?? "";
  assert.doesNotMatch(heroImage, /border|box-shadow|filter|outline/);
  assert.doesNotMatch(
    styles,
    /\.source-hero__journal-card(?:\:focus-visible|\[data-stack-position="0"\]\:hover) img\s*\{[^}]*box-shadow:/s,
  );
  assert.match(
    styles,
    /\.source-hero__journal-card\[data-stack-position="0"\]:hover img\s*\{[^}]*transform:\s*translateY\(-0\.12rem\);/s,
  );
  assert.match(
    styles,
    /\.source-hero__journal-card:focus-visible strong\s*\{[^}]*text-decoration-color:\s*currentcolor;/s,
  );
  assert.match(heroControl, /background:\s*var\(--jelly-glass-surface\)/);
  assert.doesNotMatch(
    styles,
    /\.source-hero__journal-control\[aria-disabled="true"\]\s*\{[^}]*opacity:/s,
  );
  assert.match(
    styles,
    /\.source-hero__journal-control\[aria-disabled="true"\] svg,\s*\.source-hero__journal-control:disabled svg\s*\{[^}]*opacity:\s*0\.38;/s,
  );
  assert.doesNotMatch(hero, /Запись №|source-hero__proof-link|>Перейти к записи в журнале</);
  assert.match(siteScript, /heroJournalNext\.hidden = !hasNext/);
  assert.match(hero, /aria-disabled="true"\s+disabled\s+data-hero-journal-previous/);
  assert.match(siteScript, /heroJournalPrevious\.disabled = !hasPrevious/);
  assert.match(siteScript, /heroJournalNext\.disabled = !hasNext/);
  assert.match(
    styles,
    /\.source-hero__journal-control:not\(\[aria-disabled="true"\]\):not\(:disabled\):active\s*\{[^}]*background:\s*var\(--jelly-glass-surface-strong\);[^}]*transform:\s*translateY\(0\.04rem\) scale\(0\.96\);/s,
  );
  assert.match(siteScript, /heroJournalAll\.hidden = hasNext/);
  assert.match(siteScript, /heroJournalCounter\.textContent = position/);
  assert.match(
    siteScript,
    /\(index - currentIndex \+ heroJournalCards\.length\) % heroJournalCards\.length/,
  );
  assert.match(siteScript, /position \+\s*" выбранных"/);
  assert.doesNotMatch(siteScript, /Дальше — журнал/);
  assert.match(siteScript, /event\.key === "ArrowLeft"/);
  assert.match(siteScript, /event\.key === "ArrowRight"/);
  assert.match(
    siteScript,
    /heroJournalCards\[currentIndex\]\.focus\(\{ preventScroll: true \}\)/,
  );
  assert.match(siteScript, /Math\.abs\(deltaX\) < 48/);
  assert.match(siteScript, /card\.inert = !active/);
  assert.match(siteScript, /target\.scrollIntoView\(\{/);
  assert.match(
    siteScript,
    /behavior:\s*reducedMotion\.matches \? "auto" : "smooth"/,
  );
  assert.match(siteScript, /target\.focus\(\{ preventScroll: true \}\)/);
  assert.doesNotMatch(siteScript, /setInterval\s*\(/);
});

test("the header floats lightly over the source video and leaves service details to the menu", () => {
  for (const page of [home, catalogPage]) {
    assert.match(page, /class="source-header__bar"/);
    assert.doesNotMatch(page, /source-header__note/);
    assert.doesNotMatch(
      page,
      /source-header__top|source-header__address|source-header__action|source-navigation|theme-toggle--header/,
    );
  }

  assert.match(home, /class="source-header source-header--over-media"/);
  assert.match(
    styles,
    /\.source-header\s*\{[\s\S]*?min-height:\s*var\(--masthead-panel-height\);/,
  );
  assert.match(styles, /\.source-header__bar\s*\{[\s\S]*?width:\s*100%;/);
  assert.match(
    styles,
    /\.source-header__bar\s*\{[\s\S]*?padding:\s*var\(--masthead-top-inset\) var\(--content-edge\) 1rem;/,
  );
  assert.match(styles, /\.source-brand\s*\{[\s\S]*?width:\s*var\(--brand-width-desktop\);/);
  assert.match(
    styles,
    /\.site-menu__brand\s*\{[\s\S]*?width:\s*var\(--brand-width-desktop\);/,
  );
  assert.match(styles, /\.source-header--over-media\s*\{[\s\S]*?position:\s*absolute;/);
  assert.match(styles, /\.source-header\s*\{[\s\S]*?background:\s*transparent;/);
  assert.doesNotMatch(
    styles,
    /\.source-header__top|\.source-header__address|\.source-header__action|\.source-navigation|\.theme-toggle--header/,
  );
});

test("the home brand marks the current page without linking to itself", () => {
  const homeHeader =
    home.match(/<header class="source-header[\s\S]*?<\/header>/)?.[0] ?? "";
  const homeMenuMasthead =
    home.match(/<header class="site-menu__masthead">[\s\S]*?<\/header>/)?.[0] ?? "";
  const catalogHeader =
    catalogPage.match(/<header class="source-header[\s\S]*?<\/header>/)?.[0] ?? "";

  assert.doesNotMatch(homeHeader, /<a class="source-brand"/);
  assert.doesNotMatch(homeMenuMasthead, /<a class="site-menu__brand"/);
  assert.match(catalogHeader, /<a class="source-brand brand-jelly brand-jelly--page" href="\.\.\/"/);
  assert.match(styles, /\.source-brand\s*\{[^}]*pointer-events:\s*none;/s);
  assert.match(styles, /a\.source-brand\s*\{[^}]*pointer-events:\s*auto;/s);
  assert.match(styles, /\.site-menu__brand\s*\{[^}]*pointer-events:\s*none;/s);
  assert.match(styles, /a\.site-menu__brand\s*\{[^}]*pointer-events:\s*auto;/s);
  assert.doesNotMatch(styles, /(?:^|[,\n])\s*\.source-brand:hover img/m);
  assert.doesNotMatch(styles, /(?:^|[,\n])\s*\.site-menu__brand:hover img/m);
});

test("every page uses one exact silhouette from the accepted shoal as its favicon", () => {
  assert.match(home, /rel="icon" href="assets\/favicon\.svg"/);
  assert.match(notFoundPage, /rel="icon" href="assets\/favicon\.svg"/);
  assert.match(catalogPage, /rel="icon" href="\.\.\/assets\/favicon\.svg"/);
  for (const page of [home, notFoundPage, catalogPage]) {
    assert.doesNotMatch(page, /rel="icon"[^>]+logo-redrawn\.svg/);
  }
  assert.match(favicon, /viewBox="4085 642 1000 1000"/);
  assert.match(
    favicon,
    /<title id="favicon-title">Рыба из фирменного косяка — малый знак<\/title>/,
  );
  assert.doesNotMatch(favicon, /prefers-color-scheme/);
  assert.equal((favicon.match(/<image /g) ?? []).length, 0);
  assert.doesNotMatch(favicon, /data:image/);
  assert.match(
    favicon,
    /<rect x="4085" y="642" width="1000" height="1000" fill="#f7f2e7"\/>/,
  );
  assert.equal((favicon.match(/<path /g) ?? []).length, 1);
  assert.match(favicon, /d="M5020\.31 919\.44/);
  assert.match(favicon, /fill="#004F91"/);
  const faviconFishPathData =
    favicon.match(/<path d="(M5020\.31 919\.44[^"]+)"/)?.[1] ?? "";
  const shoalPathData =
    fishPattern.match(/<path\b[^>]*\bd="([^"]+)"[^>]*\bfill="#004F91"/)?.[1] ??
    "";
  const shoalFish = shoalPathData.split(/(?=M)/);
  assert.equal(shoalFish.length, 28);
  assert.equal(faviconFishPathData, shoalFish[0]);
  assert.match(faviconTemplate, /<!-- SHOAL_FISH_PATH -->/);
  assert.doesNotMatch(logoBuilder, /logo-parts\/herring\.svg/);
  assert.match(logoBuilder, /fish-pattern\.svg/);
  assert.match(logoBuilder, /shoalFish\[0\]/);
  assert.match(logoBuilder, /logo-marks\/favicon\.svg/);
  assert.match(logoBuilder, /assets\/favicon\.svg/);
  assert.ok(Buffer.byteLength(favicon) < 30_000);
});

test("home prioritizes shopping before its editorial story and keeps local imagery", () => {
  const sequence = [
    "source-header",
    "source-hero",
    "assortment-overview",
    "price-preview",
    "watch-catch",
    "delivery-source",
    "contacts-source",
    "about-overview",
    "founder-source",
    "ship-log",
    "source-footer",
  ];

  let cursor = -1;
  for (const marker of sequence) {
    const next = home.indexOf(marker, cursor + 1);
    assert.ok(next > cursor, `Секция ${marker} должна идти в сценарном порядке`);
    cursor = next;
  }

  for (const asset of [
    "hero-ocean.jpg",
    "hero-sea-poster.webp",
    "hero-sea.mp4",
    "caviar-slab.jpg",
    "fish-pattern.svg",
    "flounder.jpg",
    "about-main.jpg",
    "about-small-2.jpg",
    "gallery-small-2.jpg",
    "oleg-gugunava.jpg",
    "delivery-basket.jpg",
  ]) {
    if (asset === "hero-ocean.jpg") {
      assert.match(styles, /url\("hero-ocean\.jpg"\)/);
    } else if (asset === "fish-pattern.svg") {
      assert.match(styles, /fish-pattern\.svg/);
    } else {
      assert.match(home, new RegExp(`assets/${asset.replace(".", "\\.")}`));
    }
  }

  const founderGrid =
    styles.match(/\.founder-source__inner\s*\{([^}]*)\}/s)?.[1] ?? "";
  assert.match(founderGrid, /align-items:\s*start;/);
  assert.doesNotMatch(
    styles,
    /\.source-quote__inner,\s*\.founder-source__inner\s*\{[^}]*align-items:\s*center;/s,
  );

  assert.doesNotMatch(home, /Feed not found|уточняйте цены|Друзья!/i);
  assert.doesNotMatch(home + catalogPage + styles, /tildacdn\.com/i);
  assert.doesNotMatch(home + catalogPage + styles, /fish-divider\.png/i);
  assert.match(home, /<video[\s\S]*?class="source-hero__video"/);
  assert.match(home, /poster="assets\/hero-sea-poster\.webp"/);
  assert.match(home, /<source[\s\S]*?src="assets\/hero-sea\.mp4"[\s\S]*?type="video\/mp4"/);
  assert.doesNotMatch(home, /youtube-nocookie\.com/);
  assert.match(home, /data-hero-video/);
  assert.match(siteScript, /prefers-reduced-motion: reduce/);
  assert.match(siteScript, /heroVideo\.pause\(\)/);
  assert.match(siteScript, /heroVideo\.currentTime = 0/);
  assert.match(styles, /object-fit:\s*cover/);
  assert.match(styles, /fish-pattern\.svg/);
  assert.match(styles, /"Iowan Old Style"/);
});

test("the founder story absorbs the principle without standalone interludes", () => {
  const founder =
    home.match(/<section class="founder-source"[\s\S]*?<\/section>/)?.[0] ?? "";

  assert.match(founder, /class="founder-source__principle"/);
  assert.match(founder, /вкус блюда определяется не только навыками повара/);
  assert.doesNotMatch(home, /class="full-photo"|class="source-quote"/);
  assert.doesNotMatch(styles, /\.full-photo|\.source-quote/);
  assert.match(
    styles,
    /\.founder-source__principle\s*\{[^}]*font-family:\s*var\(--serif\);[^}]*font-style:\s*italic;/s,
  );
});

test("the typographic scale protects reading and interface text", () => {
  for (const token of [
    "--text-reading: 1.125rem",
    "--text-body: 1.0625rem",
    "--text-catalog: 1rem",
    "--text-interface: 0.875rem",
    "--text-meta: 0.8125rem",
  ]) {
    assert.ok(styles.includes(token), `Нет обязательного токена ${token}`);
  }

  const escapeSelector = (selector) =>
    selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const [selector, token] of [
    ["body", "--text-body"],
    [".source-copy p", "--text-reading"],
    [".about-overview__reason p", "--text-reading"],
    [".founder-source__copy p", "--text-reading"],
    [".ship-log-entry__body", "--text-body"],
    [".contacts-source__details p", "--text-body"],
    [".source-button", "--text-interface"],
    [".catalog-product p", "--text-interface"],
  ]) {
    const rule =
      styles.match(
        new RegExp(`${escapeSelector(selector)}\\s*\\{([^}]*)\\}`, "s"),
      )?.[1] ?? "";
    assert.match(rule, new RegExp(`font-size:\\s*var\\(${token}\\)`));
  }

  assert.doesNotMatch(
    styles,
    /font-size:\s*0\.(?:[0-7]\d*|8[0-6]?)rem/,
    "Не возвращать локальные кегли меньше интерфейсного шага",
  );
  assert.doesNotMatch(
    styles,
    /@media \(max-width: 34rem\)[\s\S]*?\n\s+body\s*\{/,
    "На мобильном основной кегль не должен уменьшаться",
  );
});

test("the Ship's Log is a manual, attributed selection of the latest posts", () => {
  assert.match(home, /id="journal"/);
  assert.match(home, /<h2 id="journal-title">Судовой журнал<\/h2>/);
  assert.equal((home.match(/<article class="ship-log-entry"/g) ?? []).length, 4);
  for (const id of [682, 681, 680]) {
    assert.match(
      home,
      new RegExp(
        `<article class="ship-log-entry" id="journal-entry-` + id + `" tabindex="-1">`,
      ),
    );
  }
  assert.match(home, /https:\/\/t\.me\/kapitanseledkin"/);

  let cursor = -1;
  for (const id of [682, 681, 680, 679]) {
    const next = home.indexOf(`https://t.me/kapitanseledkin/${id}`, cursor + 1);
    assert.ok(next > cursor, `Запись ${id} должна идти в обратной хронологии`);
    assert.match(home, new RegExp(`assets/journal-${id}\\.jpg`));
    cursor = next;
  }

  for (const excerpt of [
    "У&nbsp;нас новый завоз царского малосольного тугунка.",
    "Первая икра дикого кижуча сезона 2026",
    "Нежнейшая малосольная черноморская барабуля",
    "Куриные котлетки тоже есть.",
  ]) {
    assert.ok(home.includes(excerpt), `Не сохранена авторская формулировка: ${excerpt}`);
  }
  assert.doesNotMatch(home, /telegram-widget|tgme_widget|Feed not found/i);
});

test("the watch catch keeps its product stories without rejected draft art", () => {
  const section =
    home.match(
      /<section\s+class="watch-catch source-section"[\s\S]*?<\/section>/,
    )?.[0] ?? "";

  assert.match(section, /<h2 id="watch-catch-title">Свежий улов<\/h2>/);
  assert.equal((section.match(/class="watch-catch__item"/g) ?? []).length, 4);
  assert.doesNotMatch(section, /<img\b|watch-catch-(?:herring|shrimp|squid|octopus)\.svg/);
  assert.doesNotMatch(
    section,
    /Первый лист серии|Каждый знак|Сменная серия|Действующие цены|watch-catch__kicker/,
  );

  for (const path of [
    "catalog/?q=Сельдь%20слабосоленая",
    "catalog/?q=Креветка%20северная",
    "catalog/?q=Кальмар%20командорский",
    "catalog/?q=Осьминог%20Марокко",
  ]) {
    assert.ok(section.includes(path), "Нет предметной ссылки каталога " + path);
  }

  for (const id of [506, 412, 610, 377]) {
    assert.match(
      section,
      new RegExp("https://t\\.me/kapitanseledkin/" + id),
    );
  }
});

test("the wide shell and linear Ship's Log avoid narrow nested cards", () => {
  assert.match(styles, /--shell:\s*84rem/);

  const gridRule =
    styles.match(/\.ship-log__grid\s*\{([^}]*)\}/s)?.[1] ?? "";
  assert.match(gridRule, /grid-template-columns:\s*1fr/);
  assert.doesNotMatch(gridRule, /repeat\(2/);

  const entryRule =
    styles.match(/\.ship-log-entry\s*\{([^}]*)\}/s)?.[1] ?? "";
  assert.match(
    entryRule,
    /grid-template-columns:\s*clamp\(10rem, 14vw, 12\.5rem\) minmax\(0, 1fr\)/,
  );
  assert.match(entryRule, /padding-block:\s*clamp\(2\.25rem, 3\.5vw, 3\.5rem\)/);
  assert.match(
    styles,
    /\.ship-log-entry:first-child \.ship-log-entry__body,[\s\S]*?columns:\s*2 18rem/,
  );
  assert.match(
    styles,
    /@media \(max-width: 61\.1875rem\)[\s\S]*?\.ship-log-entry:first-child \.ship-log-entry__body,[\s\S]*?columns:\s*auto/,
  );
});

test("the page and fullscreen menu share one stable outer content axis", () => {
  assert.match(styles, /--page-inset:\s*2\.5rem/);
  assert.match(styles, /--page-outer:\s*5rem/);
  assert.match(
    styles,
    /--content-edge:\s*max\(var\(--page-inset\), calc\(\(100vw - var\(--shell\)\) \/ 2\)\)/,
  );
  assert.match(
    styles,
    /\.source-shell\s*\{[\s\S]*?width:\s*min\(calc\(100% - var\(--page-outer\)\), var\(--shell\)\)/,
  );
  assert.match(
    styles,
    /@media \(max-width: 61\.1875rem\)[\s\S]*?\.source-hero__content\s*\{[^}]*width:\s*min\(calc\(100% - var\(--page-outer\)\), 26rem\);[^}]*margin-inline:\s*auto;/,
  );
  assert.match(
    styles,
    /\.site-menu__routes\s*\{[\s\S]*?padding:[\s\S]*?var\(--content-edge\);/,
  );
  assert.match(
    home,
    /class="about-overview source-section"[\s\S]*?<div class="source-shell">/,
  );
  assert.match(
    styles,
    /\.contacts-source\s*\{[\s\S]*?width:\s*min\(calc\(100% - var\(--page-outer\)\), var\(--shell\)\);[\s\S]*?margin-inline:\s*auto;/,
  );
});

test("the compact map keeps page scrolling until deliberate activation", () => {
  for (const required of [
    'class="contacts-source__map" data-map',
    'id="store-map-frame"',
    'tabindex="-1"',
    'aria-hidden="true"',
    'data-map-toggle',
    'aria-controls="store-map-frame"',
    'aria-pressed="false"',
    'data-map-toggle-label>Включить карту',
  ]) {
    assert.ok(home.includes(required), `Карта не содержит ${required}`);
  }

  const sectionRule =
    styles.match(/\.contacts-source\s*\{([^}]*)\}/s)?.[1] ?? "";
  assert.match(sectionRule, /grid-template-columns:\s*1fr/);
  assert.match(sectionRule, /grid-template-rows:\s*auto clamp\(22rem, 46svh, 30rem\)/);
  assert.match(sectionRule, /margin-bottom:\s*clamp\(4rem, 7vw, 7rem\)/);
  assert.match(home, /map-widget\/v1\/\?ll=37\.535850%2C55\.686220/);
  assert.doesNotMatch(home, /[?&]pt=/);
  assert.doesNotMatch(home, /map-widget\/v1\/\?[^"\s]*text=/);
  const contactCard =
    home.match(/<address class="contacts-source__card">([\s\S]*?)<\/address>/)?.[1] ?? "";
  assert.match(contactCard, /class="contacts-source__details"/);
  assert.doesNotMatch(contactCard, /<strong>|href="tel:/);
  assert.doesNotMatch(contactCard, /Телефон:|Адрес лавки:|Время работы:/);
  const mapRule =
    styles.match(/\.contacts-source__map\s*\{([^}]*)\}/s)?.[1] ?? "";
  assert.match(mapRule, /min-height:\s*0/);
  assert.match(mapRule, /overflow:\s*hidden/);
  assert.match(mapRule, /grid-column:\s*1/);
  assert.match(mapRule, /grid-row:\s*2/);

  const frameRule =
    styles.match(/\.contacts-source__map iframe\s*\{([^}]*)\}/s)?.[1] ?? "";
  assert.match(frameRule, /pointer-events:\s*none/);
  assert.match(
    styles,
    /\.contacts-source__map\.is-interactive iframe\s*\{[^}]*pointer-events:\s*auto/,
  );

  for (const required of [
    'map.classList.toggle("is-interactive", enabled)',
    'mapFrame.tabIndex = enabled ? 0 : -1',
    'mapFrame.setAttribute("aria-hidden", String(!enabled))',
    'enabled ? "Отключить карту" : "Включить карту"',
  ]) {
    assert.ok(siteScript.includes(required), `Нет поведения карты ${required}`);
  }
});

test("the footer ends both customer journeys with a useful, human invitation", () => {
  for (const page of [home, catalogPage]) {
    assert.match(page, /<footer class="source-footer" aria-labelledby="[^"]+">/);
    assert.match(page, /Лосось на вахте — заходите в лавку/);
    assert.doesNotMatch(page, /<dl class="source-footer__facts">/);
    assert.match(page, /<div class="source-footer__visit">/);
    assert.match(page, /Каждый день с&nbsp;11:00 до&nbsp;20:00/);
    const footerMarkup =
      page.match(/<footer class="source-footer"[\s\S]*?<\/footer>/)?.[0] ?? "";
    assert.doesNotMatch(footerMarkup, /Ежедневно с&nbsp;11:00 до&nbsp;20:00/);
    assert.match(page, /метро «Вавиловская»/);
    assert.match(page, /class="source-footer__portrait"/);
    assert.match(page, /salmon-cat\.jpg/);
    for (const label of ["Телеграм-канал", "YouTube", "SoundCloud"]) {
      assert.ok(page.includes("<span>" + label + "</span>"), "В подвале нет подписи " + label);
    }
    assert.match(
      page,
      /href="https:\/\/anton-gorokhovatsky\.github\.io\/design\/">Дизайн и разработка<\/a>/,
    );
    const channels =
      page.match(/<nav class="source-footer__channels"[\s\S]*?<\/nav>/)?.[0] ?? "";
    assert.doesNotMatch(channels, /WhatsApp|social-icons\.svg#whatsapp/);
    const footerActions =
      page.match(/<div class="source-footer__actions"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "";
    for (const label of ["Позвонить", "Заказать в Телеграме", "Заказать в WhatsApp"]) {
      assert.match(footerActions, new RegExp(label));
    }
    assert.equal((footerActions.match(/class="source-button /g) ?? []).length, 3);
    assert.equal((footerActions.match(/source-button--footer-contact/g) ?? []).length, 3);
    assert.doesNotMatch(
      footerActions,
      /source-button--footer-(?:primary|secondary)/,
    );
    assert.match(footerActions, /href="tel:\+79166751452"/);
    assert.match(footerActions, /href="https:\/\/t\.me\/\+79166751452"/);
    assert.match(footerActions, /href="https:\/\/wa\.me\/79166751452"/);
    const footerVisit =
      page.match(/<div class="source-footer__visit">([\s\S]*?)<\/div>/)?.[1] ?? "";
    assert.doesNotMatch(footerVisit, /tel:|\+7\s*916\s*675/);
    assert.doesNotMatch(page, /<dt>|<dd>/);
  }

  const catRule =
    styles.match(/\.source-footer__portrait\s+img\s*\{([^}]*)\}/s)?.[1] ?? "";
  assert.match(catRule, /height:\s*auto/);
  assert.doesNotMatch(catRule, /object-fit:\s*cover/);
  assert.doesNotMatch(home + catalogPage + siteScript + styles, /floating-chat|floatingChat/);

  const footerBaseRule =
    styles.match(/\.source-footer__base\s*\{([^}]*)\}/s)?.[1] ?? "";
  const footerContentRule =
    styles.match(/\.source-footer__content\s*\{([^}]*)\}/s)?.[1] ?? "";
  const footerPostscriptRule =
    styles.match(/\.source-footer__postscript\s*\{([^}]*)\}/s)?.[1] ?? "";
  assert.match(
    footerContentRule,
    /padding-block:\s*clamp\(5rem, 9vw, 8rem\) clamp\(2rem, 3vw, 3rem\)/,
  );
  assert.match(
    footerPostscriptRule,
    /padding-block:\s*0 clamp\(2\.5rem, 4vw, 3\.5rem\)/,
  );
  assert.doesNotMatch(footerPostscriptRule, /border-(?:top|bottom)\s*:/);
  assert.match(footerBaseRule, /display:\s*grid/);
  assert.match(footerBaseRule, /border-top:\s*1px solid var\(--footer-line\)/);
  assert.doesNotMatch(footerBaseRule, /border-bottom\s*:/);
  assert.match(
    footerBaseRule,
    /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s+minmax\(0,\s*1fr\)/,
  );
  assert.match(
    styles,
    /@media \(max-width: 34rem\)[\s\S]*?\.source-footer__channels\s*\{[\s\S]*?grid-template-columns:\s*1fr;/,
  );
  assert.match(
    styles,
    /@media \(max-width: 34rem\)[\s\S]*?\.source-footer__content\s*\{[^}]*padding-block:\s*4rem 1\.25rem;/,
  );
  assert.match(
    styles,
    /@media \(max-width: 34rem\)[\s\S]*?\.source-footer__postscript\s*\{[^}]*padding-block:\s*0 2\.25rem;/,
  );
});

test("menu and footer channels use one precise local SVG set with Telegram first", async () => {
  const footerSymbols = ["telegram", "youtube", "soundcloud"];
  const spriteSymbols = ["telegram", "whatsapp", "youtube", "soundcloud"];
  for (const page of [home, catalogPage]) {
    const navigation =
      page.match(/<nav class="source-footer__channels"[\s\S]*?<\/nav>/)?.[0] ?? "";
    assert.ok(navigation);
    assert.match(navigation, /class="source-footer__channel--primary"[^>]*href="https:\/\/t\.me\/kapitanseledkin"/);
    assert.equal(
      (navigation.match(/class="source-footer__channel-icon"/g) ?? []).length,
      footerSymbols.length,
    );
    assert.doesNotMatch(navigation, /<path\b/);
    for (const symbol of footerSymbols) {
      assert.match(
        navigation,
        new RegExp(`<use href="(?:\\.\\.\\/)?assets/social-icons\\.svg#${symbol}"><\\/use>`),
      );
    }
    assert.doesNotMatch(navigation, /social-icons\.svg#whatsapp/);

    const menuNetworks =
      page.match(/<div class="site-menu__networks">[\s\S]*?<\/nav>\s*<\/div>/)?.[0] ?? "";
    assert.match(menuNetworks, /<strong>Телеграм-канал<\/strong>/);
    assert.match(menuNetworks, /Судовой журнал капитана/);
    assert.match(menuNetworks, /social-icons\.svg#telegram/);
    assert.match(menuNetworks, /social-icons\.svg#youtube/);
    assert.match(menuNetworks, /social-icons\.svg#soundcloud/);
    assert.doesNotMatch(menuNetworks, /social-icons\.svg#whatsapp/);
  }

  const channelRule =
    styles.match(/\.source-footer__channels\s+a\s*\{([^}]*)\}/s)?.[1] ?? "";
  assert.doesNotMatch(channelRule, /border-radius|background(?:-color)?\s*:/);
  assert.match(styles, /\.source-footer__channel-icon\s*\{[\s\S]*?width:\s*1\.35rem;/);
  assert.doesNotMatch(
    styles,
    /source-footer__channel--primary[^}]*font-size|source-footer__channel--primary[^}]*channel-icon/,
  );

  const sprite = await readFile(
    new URL("../assets/social-icons.svg", import.meta.url),
    "utf8",
  );
  for (const symbol of spriteSymbols) {
    assert.match(sprite, new RegExp(`<symbol id="${symbol}" viewBox="0 0 24 24">`));
  }
  assert.equal(
    createHash("sha256").update(sprite).digest("hex"),
    "4134ef4ba0dd886fc675c76441ba241bdeb3453c7b9d4f1b453b981f7ebb3eb9",
  );
});

test("the complete catalog has stable categories and 114 priced items", () => {
  assert.equal(catalog.length, 7);
  assert.equal(
    catalog.reduce((total, category) => total + category.items.length, 0),
    114,
  );
  assert.deepEqual(
    catalog.map((category) => [category.slug, category.items.length]),
    [
      ["caviar", 8],
      ["seafood", 20],
      ["frozen-fish", 35],
      ["fillet", 7],
      ["steaks", 5],
      ["prepared-fish", 12],
      ["other", 27],
    ],
  );

  for (const category of catalog) {
    assert.ok(category.label);
    assert.ok(category.shortLabel);
    for (const product of category.items) {
      assert.ok(product.name);
      assert.match(product.price, /₽/);
    }
  }
});

test("published Russian text uses the shared typographic rules", () => {
  assert.equal(
    typographText("И в лавке от 11:00 до 20:00"),
    "И\u00a0в\u00a0лавке от\u00a011:00 до\u00a020:00",
  );
  assert.equal(
    typographText("Цена 15 000 ₽ за 0,5 кг"),
    "Цена 15\u202f000\u00a0₽ за\u00a00,5\u00a0кг",
  );
  assert.equal(
    typographPrice("15000 ₽/0,125 кг"),
    "15\u202f000\u00a0₽/0,125\u00a0кг",
  );
  assert.equal(typographText("всё „ок“"), "всё «ок»");
  assert.equal(
    typographText("ул. Строителей, д. 7, корп. 1"),
    "ул.\u00a0Строителей, д.\u00a07, корп.\u00a01",
  );
  assert.equal((home.match(/Заказы принимаются\s*<span class="source-nowrap">в&nbsp;/g) ?? []).length, 1);
  assert.equal((home.match(/<span class="source-nowrap">и&nbsp;/g) ?? []).length, 1);
  assert.equal((home.match(/>телеграме<\/a><\/span>\./g) ?? []).length, 1);
  assert.doesNotMatch(home, /Заказы принимаются[\s\S]{0,180}>Телеграме<\/a>/);
  assert.match(styles, /\.source-nowrap\s*\{\s*white-space:\s*nowrap;/);
});

test("home catalog is a compact projection of the full catalog", () => {
  const preview =
    home.match(/<section class="price-preview[\s\S]*?<\/section>/)?.[0] ?? "";

  assert.match(preview, /<h2 id="prices-title">Продукты и цены<\/h2>/);
  assert.equal((preview.match(/class="catalog-product"/g) ?? []).length, 6);
  assert.equal((preview.match(/href="catalog\/"/g) ?? []).length, 1);
  assert.match(preview, /class="catalog-product-head"/);
  assert.match(styles, /\.catalog-product :is\(h3, h4\)\s*\{/);
  assert.doesNotMatch(styles, /\.price-preview__grid \.catalog-product\s*\{/);
  assert.match(
    styles,
    /\.price-preview__header\s*\{[^}]*align-items:\s*start;/s,
  );
  assert.doesNotMatch(
    preview,
    /price-categories|price-preview__actions|wa\.me|t\.me/,
  );
  assert.match(
    styles,
    /\.price-preview__grid \.catalog-product-head::after|\.catalog-product-head::after/,
  );
});

test("catalog search and filters expose accessible state", () => {
  assert.match(catalogPage, /aria-live="polite"/);
  assert.match(catalogPage, /data-catalog-search/);
  assert.match(catalogPage, /data-catalog-select/);
  assert.match(catalogScript, /aria-pressed/);
  assert.match(catalogScript, /select\.value = activeCategory/);
  assert.match(catalogScript, /Ничего не найдено/);
  assert.doesNotMatch(catalogScript, /Уточнить наличие|productMessage|catalog-product__action/);
  for (const category of catalog) {
    for (const product of category.items) {
      assert.doesNotMatch(product.description ?? "", /уточн(?:ить|яйте) наличие/iu);
    }
  }
});

test("catalog entry stacks its copy, search and categories without decorative dividers", () => {
  assert.match(
    catalogPage,
    /class="catalog-intro__stack"[\s\S]*?<h1>Продукты и цены<\/h1>[\s\S]*?class="catalog-controls"[\s\S]*?data-catalog-search[\s\S]*?id="catalog-filter-label">Категории<[\s\S]*?data-catalog-filters/,
  );
  assert.match(
    styles,
    /\.catalog-intro__stack\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(20rem, 0\.82fr\) minmax\(28rem, 1\.18fr\);[^}]*width:\s*100%;[^}]*align-items:\s*start;/s,
  );
  assert.match(
    styles,
    /\.catalog-page \.source-header,\s*\.catalog-page \.source-header__bar\s*\{[^}]*min-height:\s*9\.75rem;/s,
  );
  assert.match(
    styles,
    /@media \(max-width: 61\.1875rem\)[\s\S]*?\.catalog-intro__stack\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);[^}]*width:\s*min\(100%, 42rem\);/s,
  );
  assert.match(
    styles,
    /\.catalog-intro h1\s*\{[^}]*overflow-wrap:\s*normal;/s,
  );
  assert.match(
    styles,
    /\.catalog-intro__copy\s*\{[^}]*width:\s*100%;/s,
  );
  assert.match(
    styles,
    /\.controls-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/s,
  );
  const controlsRule =
    styles.match(/\.catalog-controls\s*\{([^}]*)\}/s)?.[1] ?? "";
  assert.match(controlsRule, /min-width:\s*0;[^}]*max-width:\s*100%;/s);
  assert.doesNotMatch(
    controlsRule,
    /position:\s*sticky|border|background|box-shadow|backdrop-filter/,
  );
  assert.match(
    styles,
    /\.catalog-filters\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;[^}]*gap:/s,
  );
  assert.doesNotMatch(
    styles,
    /\.catalog-filters\s*\{[^}]*grid-template-columns:/s,
  );
  for (const selector of [
    "\\.catalog-search",
    "\\.catalog-search input",
    "\\.catalog-select",
    "\\.catalog-select select",
  ]) {
    const rule =
      styles.match(new RegExp(selector + "\\s*\\{([^}]*)\\}", "s"))?.[1] ?? "";
    assert.match(rule, /min-width:\s*0;[^}]*max-width:\s*100%;/s);
  }
  assert.match(
    styles,
    /\.catalog-search input::placeholder\s*\{[^}]*color:\s*var\(--muted\);[^}]*opacity:\s*1;/s,
  );
  assert.match(
    styles,
    /\.catalog-results\s*\{[^}]*padding:\s*1rem 0 3rem;/s,
  );
  assert.match(
    styles,
    /\.catalog-category:first-child\s*\{[^}]*padding-top:\s*1\.75rem;/s,
  );
  assert.match(
    styles,
    /\.catalog-category\s*\{[\s\S]*?scroll-margin-top:\s*10rem;/,
  );
  const productRule =
    styles.match(/\.catalog-product\s*\{([^}]*)\}/s)?.[1] ?? "";
  assert.doesNotMatch(productRule, /border(?:-bottom)?:/);
  assert.match(
    styles,
    /\.catalog-product-head::after\s*\{[\s\S]*?border-bottom:\s*1px dotted var\(--muted\);/,
  );
  assert.match(
    styles,
    /\.catalog-category \+ \.catalog-category\s*\{[^}]*border-top:\s*1px solid var\(--line\);/,
  );
  assert.match(
    styles,
    /@media \(max-width: 61\.1875rem\)[\s\S]*?\.catalog-product-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/s,
  );
  assert.match(
    styles,
    /@media \(max-width: 34rem\)[\s\S]*?\.catalog-product-head\s*\{[^}]*flex-wrap:\s*wrap;[^}]*\}[\s\S]*?\.catalog-product strong\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;[^}]*flex:\s*0 1 auto;[^}]*overflow-wrap:\s*anywhere;[^}]*white-space:\s*normal;/s,
  );
});

test("one restrained jelly material serves translucent controls", () => {
  const lightRoot = styles.match(/:root\s*\{([^}]*)\}/s)?.[1] ?? "";
  assert.match(lightRoot, /--jelly-glass-surface:/);
  assert.match(lightRoot, /--jelly-glass-filter:\s*blur\(0\.85rem\) saturate\(106%\);/);
  for (const selector of [
    "floating-menu",
    "contacts-source__map-toggle",
    "source-hero__journal-control",
    "site-menu__routes",
  ]) {
    const rule =
      styles.match(new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`, "s"))?.[1] ?? "";
    assert.match(
      rule,
      /backdrop-filter:\s*var\(--jelly-glass-filter\);/,
      `У .${selector} потерян общий фильтр материала`,
    );
    assert.match(
      rule,
      /background:\s*var\(--jelly-glass-surface(?:-strong)?\);/,
      `У .${selector} потеряна общая поверхность материала`,
    );
  }
  const journalCardRule =
    styles.match(/\.source-hero__journal-card\s*\{([^}]*)\}/s)?.[1] ?? "";
  assert.doesNotMatch(
    journalCardRule,
    /background|backdrop-filter|box-shadow/,
    "У листа журнала не должно быть подложки: материал разрешён только контролам",
  );
  assert.match(styles, /\.source-button--menu-primary\s*\{[^}]*background:\s*var\(--footer-text\);/s);
  assert.match(
    styles,
    /\.source-button--hero-primary\s*\{[^}]*background:\s*var\(--sea-jelly-surface\);[^}]*backdrop-filter:\s*var\(--jelly-glass-filter\);/s,
  );
  assert.match(
    styles,
    /\.source-button--hero-secondary,[\s\S]*?\.source-button--footer-contact,[\s\S]*?\{[^}]*background:\s*var\(--jelly-glass-surface\);[^}]*backdrop-filter:\s*var\(--jelly-glass-filter\);/s,
  );
  assert.match(projectRules, /один токенизированный материал «медуза»/);
  assert.doesNotMatch(styles, /--jelly-glass-on-blue/);
  assert.doesNotMatch(lightRoot, /--jelly-glass-surface[^;]*gradient\(/);
});

test("pointer hover, pressed state and keyboard focus stay visibly distinct", () => {
  const hoverStart = styles.indexOf("@media (hover: hover) and (pointer: fine)");
  const pressedStart = styles.indexOf("/* Pressed states */", hoverStart);
  const pressedEnd = styles.indexOf(
    "@media (prefers-reduced-motion: reduce)",
    pressedStart,
  );
  assert.ok(hoverStart >= 0 && pressedStart > hoverStart);
  assert.ok(pressedEnd > pressedStart);
  const hoverMedia = styles.slice(hoverStart, pressedStart);
  const pressedStates = styles.slice(pressedStart, pressedEnd);

  for (const selector of [
    ".floating-menu:hover",
    ".catalog-search input:hover",
    ".catalog-filters button:hover",
    ".contacts-source__map-toggle:hover",
    ".source-hero__journal-control:not([aria-disabled=\"true\"]):hover",
    ".source-hero__journal-card[data-stack-position=\"0\"]:hover img",
    ".theme-toggle:not(.theme-toggle--menu):hover",
  ]) {
    assert.ok(
      hoverMedia.includes(selector),
      `Нет явного pointer-hover для ${selector}`,
    );
  }

  for (const selector of [
    "a:active",
    ".source-button:active",
    ".source-hero__journal-control:not([aria-disabled=\"true\"]):not(:disabled):active",
    ".source-hero__journal-card[data-stack-position=\"0\"]:active img",
    ".assortment-directory__link:active",
    ".site-menu__routes nav a:active",
    ".site-menu__channel:active",
    ".site-menu__socials a:active",
    ".source-footer__channels a:active",
    ".floating-menu:active",
    ".contacts-source__map-toggle:active",
    ".theme-toggle:active",
    ".catalog-filters button:active",
    ".reset-button:active",
  ]) {
    assert.ok(
      pressedStates.includes(selector) || styles.slice(0, hoverStart).includes(selector),
      `Нет явного pressed-состояния для ${selector}`,
    );
  }

  const catalogFilterHover =
    hoverMedia.match(
      /\.catalog-filters button:hover,[\s\S]*?\.reset-button:hover\s*\{([^}]*)\}/,
    )?.[1] ?? "";
  const catalogSearchHover =
    hoverMedia.match(
      /\.catalog-search input:hover,[\s\S]*?\.catalog-select select:hover\s*\{([^}]*)\}/,
    )?.[1] ?? "";
  assert.doesNotMatch(catalogSearchHover, /background/);
  assert.doesNotMatch(
    catalogFilterHover,
    /background/,
    "Текстовые фильтры не должны получать прямоугольную подложку",
  );
  const catalogFilterPressed =
    pressedStates.match(
      /\.catalog-filters button:active,[\s\S]*?\.reset-button:active\s*\{([^}]*)\}/,
    )?.[1] ?? "";
  assert.doesNotMatch(catalogFilterPressed, /background/);
  const catalogFilterSelected =
    styles.match(/\.catalog-filters button\[aria-pressed="true"\]\s*\{([^}]*)\}/)?.[1] ??
    "";
  assert.doesNotMatch(catalogFilterSelected, /background/);

  assert.match(
    styles,
    /\.source-button--hero-secondary:hover,[\s\S]*?\.source-button--footer-contact:hover,[\s\S]*?\{[^}]*background:\s*var\(--jelly-glass-surface-strong\);/s,
  );
  assert.match(
    pressedStates,
    /\.source-button:active\s*\{[^}]*transform:\s*translateY\(0\.04rem\) scale\(0\.98\);/s,
  );
  assert.match(
    pressedStates,
    /\.source-footer__channels a:active span\s*\{[^}]*text-decoration-thickness:\s*0\.16em;/s,
  );
  assert.match(
    pressedStates,
    /\.source-hero__journal-card\[data-stack-position="0"\]:active img\s*\{[^}]*scale\(0\.985\);/s,
  );
  assert.match(styles, /:focus-visible\s*\{[^}]*outline:\s*0\.2rem solid var\(--focus\);/s);
  assert.match(
    styles,
    /\.skip-link:focus\s*\{[^}]*transform:\s*translateY\(0\);[^}]*transition:\s*none;/s,
  );
  assert.match(
    styles,
    /:root\[data-input-modality="pointer"\] \.floating-menu:focus-visible\s*\{[^}]*outline:\s*none;/s,
  );
  assert.doesNotMatch(
    styles,
    /:root\[data-input-modality="keyboard"\][^{]*:focus-visible\s*\{[^}]*outline:\s*none;/s,
  );
});

test("one master shoal keeps deliberate foreground, tonal and sea roles", () => {
  assert.match(styles, /--fish-shoal-width:\s*clamp\(36rem, 58vw, 52rem\);/);
  assert.match(styles, /--shoal-primary:\s*#0879bd;/);
  assert.match(styles, /--shoal-tonal:\s*hsl\(204 34% 92%\);/);
  assert.match(styles, /--shoal-on-sea:\s*rgb\(255 248 237 \/ 14%\);/);
  assert.match(
    styles,
    /\.ship-log::before,[\s\S]*?\.not-found-source::before\s*\{[^}]*-webkit-mask:\s*url\("fish-pattern\.svg"\) center \/ contain no-repeat;[^}]*mask:\s*url\("fish-pattern\.svg"\) center \/ contain no-repeat;/s,
  );
  assert.match(styles, /\.catalog-intro\s*\{[^}]*overflow:\s*hidden;/s);
  assert.doesNotMatch(catalogPage + styles, /catalog-intro__shoal/);
  assert.doesNotMatch(home + styles, /fish-divider/);
  assert.doesNotMatch(styles, /\.catalog-order::before/);
  assert.match(
    styles,
    /\.ship-log::before\s*\{[^}]*width:\s*var\(--fish-shoal-width\);[^}]*--shoal-color:\s*var\(--shoal-tonal\);/s,
  );
  assert.match(
    styles,
    /\.source-footer::before\s*\{[^}]*width:\s*var\(--fish-shoal-width\);[^}]*--shoal-color:\s*var\(--shoal-on-sea\);/s,
  );
  assert.match(
    styles,
    /\.not-found-source::before\s*\{[^}]*--shoal-color:\s*var\(--shoal-primary\);/s,
  );
  const patternRules = [...styles.matchAll(/([^{}]+)\{([^{}]*fish-pattern\.svg[^{}]*)\}/g)];
  assert.equal(patternRules.length, 1);
  for (const [, selector, declarations] of patternRules) {
    assert.doesNotMatch(declarations, /scaleX\(-1\)|transform:\s*rotate\(/, selector.trim());
  }
});

test("menu, focus and reduced motion remain accessible", () => {
  for (const [page, journalPath] of [
    [home, "#journal"],
    [catalogPage, "../#journal"],
  ]) {
    assert.match(page, /aria-controls="primary-navigation"/);
    assert.equal((page.match(/data-menu-toggle/g) ?? []).length, 1);
    assert.doesNotMatch(page, /data-menu-close|site-menu__close/);
    assert.doesNotMatch(page, /Навигационный мостик|site-menu__deck/);
    assert.ok(page.includes('<h2 id="menu-title">Куда держим курс?</h2>'));
    assert.match(page, /class="site-menu__masthead"/);
    assert.match(page, /class="site-menu__layout"/);
    assert.match(page, /class="site-menu__service"/);
    assert.doesNotMatch(page, /Лавка на Вавиловской/);
    assert.equal((page.match(/data-menu-sea-video/g) ?? []).length, 1);
    assert.match(page, /class="site-menu__service-video"/);
    assert.match(page, /poster="(?:\.\.\/)?assets\/hero-sea-poster\.webp"/);
    assert.match(
      page,
      /<source[\s\S]*?src="(?:\.\.\/)?assets\/hero-sea\.mp4"[\s\S]*?type="video\/mp4"/,
    );
    assert.doesNotMatch(
      page.match(/<video[\s\S]*?data-menu-sea-video[\s\S]*?<\/video>/)?.[0] ?? "",
      /\bautoplay\b/,
    );
    const layoutIndex = page.indexOf('<div class="site-menu__layout">');
    const seaVideoIndex = page.indexOf('class="site-menu__service-video"', layoutIndex);
    const routesIndex = page.indexOf('class="site-menu__routes"', layoutIndex);
    assert.ok(layoutIndex >= 0 && seaVideoIndex > layoutIndex && routesIndex > seaVideoIndex);
    assert.match(page, /class="site-menu__actions"/);
    assert.match(page, /href="tel:\+79166751452"/);
    assert.match(page, />\s*Позвонить\s*</);
    assert.match(page, /https:\/\/t\.me\/\+79166751452/);
    assert.match(page, /https:\/\/wa\.me\/79166751452/);
    assert.doesNotMatch(page, /site-menu__phone/);
    const contactActions =
      page.match(/<div class="site-menu__actions">([\s\S]*?)<\/div>/)?.[1] ?? "";
    assert.equal((contactActions.match(/class="source-button/g) ?? []).length, 3);
    assert.match(page, /class="theme-toggle__moon"/);
    assert.match(page, /class="theme-toggle__sun"/);
    assert.ok(page.includes(`href="${journalPath}"`));
    assert.doesNotMatch(page, />×</);

    const routes = page.match(
      /<section class="site-menu__routes">([\s\S]*?)<\/section>/,
    )?.[1] ?? "";
    assert.equal((routes.match(/<a\s/g) ?? []).length, 6);
  }

  assert.match(siteScript, /event\.key === "Escape"/);
  assert.match(siteScript, /event\.key !== "Tab"/);
  assert.match(siteScript, /menuButtonLabel\.textContent = "Закрыть"/);
  assert.match(siteScript, /menuButtonLabel\.textContent = "Меню"/);
  assert.doesNotMatch(siteScript, /menuClose/);
  assert.match(siteScript, /menuPanel\.scrollTop = 0/);
  assert.match(siteScript, /element\.inert = value/);
  assert.equal((siteScript.match(/menuButton\.focus\(\)/g) ?? []).length, 1);
  const openMenuBody =
    siteScript.match(/function openMenu\(\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.doesNotMatch(openMenuBody, /\.focus\(/);
  assert.match(siteScript, /closeMenu\(\{ returnFocus: true \}\)/);
  assert.match(styles, /--masthead-control-size:\s*3\.375rem/);
  assert.match(styles, /--masthead-panel-height:\s*11rem/);
  assert.match(styles, /--masthead-top-inset:\s*2\.5rem/);
  assert.match(styles, /--brand-width-desktop:\s*15rem/);
  assert.match(
    styles,
    /\.floating-menu\s*\{[\s\S]*?top:\s*var\(--masthead-top-inset\);/,
  );
  assert.match(
    styles,
    /@media \(max-width: 61\.1875rem\)[\s\S]*?\.floating-menu\s*\{[\s\S]*?width:\s*var\(--masthead-control-size\);[\s\S]*?border-radius:\s*50%;/,
  );
  assert.match(
    styles,
    /@media \(max-width: 61\.1875rem\)[\s\S]*?\.floating-menu__label\s*\{[\s\S]*?clip-path:\s*inset\(50%\);/,
  );
  assert.match(
    styles,
    /@media \(max-width: 61\.1875rem\)[\s\S]*?\.site-menu__masthead\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?top:\s*0;[\s\S]*?background:\s*var\(--jelly-glass-surface\);[\s\S]*?backdrop-filter:\s*var\(--jelly-glass-filter\);[\s\S]*?pointer-events:\s*auto;/,
  );
  assert.match(
    styles,
    /@media \(max-width: 61\.1875rem\)[\s\S]*?\.site-menu__brand\s*\{[^}]*width:\s*clamp\(6\.25rem, 29vw, 7rem\);/,
  );
  assert.match(
    styles,
    /@media \(max-width: 61\.1875rem\)[\s\S]*?\.site-menu__routes\s*\{[^}]*padding:\s*2rem var\(--page-inset\) 4rem;/,
  );
  assert.doesNotMatch(styles, /min\(43vw, 10\.5rem\)/);
  assert.match(
    styles,
    /@media \(max-width: 61\.1875rem\)[\s\S]*?\.site-menu__masthead\s*\{[^}]*height:\s*calc\(var\(--masthead-control-size\) \+ var\(--masthead-top-inset\) \* 2\);[^}]*min-height:\s*0;/,
  );
  assert.match(home, /role="dialog"/);
  assert.match(home, /aria-modal="true"/);
  assert.match(styles, /\.floating-menu\s*\{[\s\S]*?position:\s*fixed;/);
  assert.match(styles, /\.floating-menu\s*\{[\s\S]*?z-index:\s*110;/);
  assert.match(styles, /\.floating-menu\s*\{[\s\S]*?width:\s*8\.35rem;/);
  assert.match(
    styles,
    /\.floating-menu\[aria-expanded="true"\] \.floating-menu__mark::before\s*\{[\s\S]*?rotate\(45deg\)/,
  );
  assert.match(styles, /\.site-menu\s*\{[\s\S]*?inset:\s*0;/);
  assert.match(styles, /\.site-menu__panel\s*\{[\s\S]*?height:\s*100dvh;/);
  assert.match(
    styles,
    /\.site-menu__masthead\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?padding:\s*var\(--masthead-top-inset\) var\(--content-edge\) 0;[\s\S]*?pointer-events:\s*none;/,
  );
  const menuMastheadRule =
    styles.match(/\.site-menu__masthead\s*\{([^}]*)\}/s)?.[1] ?? "";
  assert.doesNotMatch(
    menuMastheadRule,
    /background|border|box-shadow|backdrop-filter|min-height/,
  );
  assert.doesNotMatch(styles, /\.site-menu__topbar|\.site-menu__deck/);
  assert.match(styles, /\.site-menu__layout\s*\{[\s\S]*?min-height:\s*100dvh;/);
  assert.match(
    styles,
    /\.site-menu__routes\s*\{[\s\S]*?background:\s*var\(--jelly-glass-surface\);[\s\S]*?backdrop-filter:\s*var\(--jelly-glass-filter\);/,
  );
  assert.match(
    styles,
    /@media \(max-width: 61\.1875rem\)[\s\S]*?--masthead-top-inset:\s*clamp\(12px, 3\.5vw, 18px\);[\s\S]*?\.floating-menu\s*\{[\s\S]*?top:\s*var\(--masthead-top-inset\);/,
  );
  assert.match(
    styles,
    /grid-template-columns:\s*minmax\(0, 1\.45fr\) minmax\(22rem, 0\.75fr\)/,
  );
  assert.match(
    styles,
    /\.site-menu__service-video\s*\{[\s\S]*?object-fit:\s*cover;/,
  );
  assert.match(
    styles,
    /\.site-menu__service::before\s*\{[\s\S]*?background:\s*var\(--menu-sea-veil\);[\s\S]*?backdrop-filter:\s*var\(--menu-sea-filter\);/,
  );
  assert.doesNotMatch(
    styles,
    /\.site-menu__service::before\s*\{[^}]*fish-pattern\.svg/s,
  );
  assert.match(siteScript, /const menuSeaVideo = menu\?\.querySelector/);
  assert.match(siteScript, /function syncMenuSeaVideo\(\)/);
  assert.match(siteScript, /menuSeaVideo\.play\(\)/);
  assert.match(siteScript, /menuSeaVideo\.pause\(\)/);
  assert.match(siteScript, /document\.documentElement\.dataset\.inputModality = "pointer"/);
  assert.match(siteScript, /document\.documentElement\.dataset\.inputModality = "keyboard"/);
  assert.match(
    styles,
    /:root\[data-input-modality="pointer"\] \.floating-menu:focus-visible\s*\{[\s\S]*?outline:\s*none/,
  );
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /prefers-contrast:\s*more/);
  assert.match(styles, /forced-colors:\s*active/);
});

test("menu dividers express structure instead of filling space", () => {
  const networks =
    styles.match(/\.site-menu__networks\s*\{([^}]*)\}/s)?.[1] ?? "";
  const routes =
    styles.match(/\.site-menu__routes nav\s*\{([^}]*)\}/s)?.[1] ?? "";
  const routeLink =
    styles.match(/\.site-menu__routes nav a\s*\{([^}]*)\}/s)?.[1] ?? "";

  assert.doesNotMatch(networks, /border-(?:top|bottom|block)/);
  assert.doesNotMatch(networks, /padding-top/);
  assert.match(routes, /gap:/);
  assert.doesNotMatch(routeLink, /border-(?:top|bottom|block)/);
  assert.doesNotMatch(styles, /\.site-menu__routes nav a:last-child/);
  assert.match(
    projectRules,
    /Разделители не запрещены, но каждый должен обозначать реальную границу/,
  );
});

test("theme follows store hours and a deliberate choice persists across pages", () => {
  assert.equal(themeStorageKey, "seledkin-theme");
  assert.equal(storeTimeZone, "Europe/Moscow");
  assert.equal(storeOpenHour, 11);
  assert.equal(storeCloseHour, 20);
  assert.equal(normalizeTheme("light"), "light");
  assert.equal(normalizeTheme("dark"), "dark");
  assert.equal(normalizeTheme("sepia"), null);
  assert.equal(effectiveTheme(null, false), "light");
  assert.equal(effectiveTheme(null, true), "dark");
  assert.equal(effectiveTheme(null, true, "light"), "light");
  assert.equal(effectiveTheme(null, false, "dark"), "dark");
  assert.equal(effectiveTheme("light", true), "light");
  assert.equal(effectiveTheme("dark", false), "dark");
  assert.equal(effectiveTheme("dark", false, "light"), "dark");

  assert.equal(scheduledTheme(new Date("2026-08-26T07:59:59Z")), "dark");
  assert.equal(scheduledTheme(new Date("2026-08-26T08:00:00Z")), "light");
  assert.equal(scheduledTheme(new Date("2026-08-26T16:59:59Z")), "light");
  assert.equal(scheduledTheme(new Date("2026-08-26T17:00:00Z")), "dark");
  assert.equal(scheduledTheme(new Date("invalid")), null);
  assert.equal(
    millisecondsUntilThemeShift(new Date("2026-08-26T07:59:30Z")),
    30_050,
  );
  assert.equal(
    millisecondsUntilThemeShift(new Date("2026-08-26T16:59:30Z")),
    30_050,
  );

  assert.match(siteScript, /import "\.\/theme\.js"/);
  for (const page of [home, catalogPage, notFoundPage]) {
    assert.match(page, /localStorage\.getItem\("seledkin-theme"\)/);
    assert.match(page, /timeZone:\s*"Europe\/Moscow"/);
    assert.match(page, /hour >= 11 && hour < 20/);
    assert.match(page, /dataset\.themeSource = "explicit"/);
    assert.match(page, /data-theme-toggle/);
    assert.match(page, /Ночная вахта/);
    assert.doesNotMatch(page, /data-theme-toggle[^>]*aria-pressed/);
  }
  assert.match(themeScript, /function scheduleNextShift\(\)/);
  assert.match(themeScript, /document\.addEventListener\("visibilitychange"/);
  assert.match(themeScript, /root\.dataset\.theme = theme/);
  assert.match(themeScript, /root\.dataset\.themeSource = "explicit"/);
  assert.match(notFoundPage, /assets\/theme\.js/);
  assert.match(styles, /:root\[data-theme="dark"\]/);
  assert.match(styles, /prefers-color-scheme:\s*dark/);

  for (const [foreground, background, minimum] of [
    ["#f3ede2", "#0e202b", 4.5],
    ["#b8c2c8", "#0e202b", 4.5],
    ["#0e202b", "#b8c2c8", 4.5],
    ["#7dccf2", "#0e202b", 4.5],
    ["#83d8b8", "#0e202b", 4.5],
    ["#d6b46c", "#0e202b", 4.5],
    ["#ffc15c", "#0e202b", 3],
    ["#5d707b", "#0e202b", 3],
  ]) {
    assert.ok(
      contrast(foreground, background) >= minimum,
      `${foreground} on ${background} must reach ${minimum}:1`,
    );
  }
});

test("Night Watch switches the hero and menu to a dedicated night sea file", async () => {
  assert.equal((home.match(/data-theme-video(?:\s|>)/g) ?? []).length, 2);
  assert.equal((catalogPage.match(/data-theme-video(?:\s|>)/g) ?? []).length, 1);

  for (const page of [home, catalogPage]) {
    assert.match(page, /data-poster-light="(?:\.\.\/)?assets\/hero-sea-poster\.webp"/);
    assert.match(page, /data-poster-dark="(?:\.\.\/)?assets\/hero-sea-night-poster\.jpg"/);
    assert.match(page, /data-src-light="(?:\.\.\/)?assets\/hero-sea\.mp4"/);
    assert.match(page, /data-src-dark="(?:\.\.\/)?assets\/hero-sea-night\.mp4"/);
    assert.match(page, /data-theme-video-source/);
  }

  assert.match(themeScript, /document\.querySelectorAll\("\[data-theme-video\]"\)/);
  assert.match(themeScript, /source\?\.dataset\.srcDark/);
  assert.match(themeScript, /source\?\.dataset\.srcLight/);
  assert.match(themeScript, /video\.load\(\)/);
  assert.match(themeScript, /seledkin:themechange/);
  assert.match(siteScript, /document\.addEventListener\("seledkin:themechange"/);
  assert.match(projectRules, /Ночное море — отдельный медиавариант/);
  assert.match(nightSeaProvenance, /ничего не дорисовано и не сгенерировано/);

  assert.deepEqual(
    {
      source: nightSeaManifest.source,
      output: nightSeaManifest.output,
      poster: nightSeaManifest.poster,
      durationSeconds: nightSeaManifest.durationSeconds,
      width: nightSeaManifest.width,
      height: nightSeaManifest.height,
      frameRate: nightSeaManifest.frameRate,
      videoCodec: nightSeaManifest.videoCodec,
      pixelFormat: nightSeaManifest.pixelFormat,
    },
    {
      source: "hero-sea.mp4",
      output: "hero-sea-night.mp4",
      poster: "hero-sea-night-poster.jpg",
      durationSeconds: 8,
      width: 1280,
      height: 720,
      frameRate: 30,
      videoCodec: "h264",
      pixelFormat: "yuv420p",
    },
  );

  for (const [path, expected] of [
    ["../assets/hero-sea.mp4", nightSeaManifest.sourceSha256],
    ["../assets/hero-sea-night.mp4", nightSeaManifest.outputSha256],
    ["../assets/hero-sea-night-poster.jpg", nightSeaManifest.posterSha256],
  ]) {
    const binary = await readFile(new URL(path, import.meta.url));
    assert.equal(createHash("sha256").update(binary).digest("hex"), expected);
  }
});

test("Night Watch keeps the original blue logo ink instead of inverting it", () => {
  for (const page of [home, catalogPage, notFoundPage]) {
    assert.match(page, /data-theme-logo/);
    assert.match(page, /data-logo-light="(?:\.\.\/)?assets\/logo-redrawn-sea\.svg"/);
    assert.match(page, /data-logo-dark="(?:\.\.\/)?assets\/logo-redrawn-sea\.svg"/);
  }

  assert.equal(
    (home.match(/data-theme-logo/g) ?? []).length,
    3,
    "the desktop brand, menu brand and mobile hero brand must all follow the active watch",
  );

  assert.match(themeScript, /document\.querySelectorAll\("\[data-theme-logo\]"\)/);
  assert.match(themeScript, /logo\.dataset\.logoDark/);
  assert.match(themeScript, /logo\.dataset\.logoLight/);
  assert.match(styles, /content:\s*url\("logo-redrawn-sea\.svg"\)/);
  assert.doesNotMatch(styles, /content:\s*url\("logo-redrawn-night\.svg"\)/);

});

test("the custom 404 resolves assets and actions from the deployment root", () => {
  const baseBootstrap = notFoundPage.indexOf(
    `const base = document.createElement("base")`,
  );
  const firstRelativeAsset = notFoundPage.indexOf(
    `<link rel="stylesheet" href="assets/styles.css"`,
  );

  assert.ok(baseBootstrap >= 0);
  assert.ok(firstRelativeAsset > baseBootstrap);
  assert.match(
    notFoundPage,
    /window\.location\.hostname\.endsWith\("\.github\.io"\)[\s\S]*?"\/seledkin\/"[\s\S]*?document\.head\.append\(base\)/,
  );
});

test("every rendered logo keeps exact geometry across contextual jelly modes", async () => {
  const logoClass = /class="[^"]*\bbrand-jelly(?=\s|")/g;
  assert.equal((home.match(logoClass) ?? []).length, 3);
  assert.equal((catalogPage.match(logoClass) ?? []).length, 2);
  assert.equal((notFoundPage.match(logoClass) ?? []).length, 1);
  assert.equal((home.match(/brand-jelly--sea/g) ?? []).length, 2);
  assert.equal((home.match(/brand-jelly--panel/g) ?? []).length, 1);
  assert.equal((catalogPage.match(/brand-jelly--page/g) ?? []).length, 1);
  assert.equal((catalogPage.match(/brand-jelly--panel/g) ?? []).length, 1);
  assert.equal((notFoundPage.match(/brand-jelly--page/g) ?? []).length, 1);
  for (const page of [home, catalogPage, notFoundPage]) {
    assert.doesNotMatch(page, /source-hero__mobile-jelly|data-logo-squid/);
    assert.doesNotMatch(page, /src="(?:\.\.\/)?assets\/logo-redrawn\.svg"/);
  }
  assert.match(
    styles,
    /\.brand-jelly::before,\s*\.brand-jelly::after\s*\{[^}]*mask:\s*url\("logo-redrawn-jelly-mask\.svg"\)/s,
  );
  assert.match(
    styles,
    /\.brand-jelly::before\s*\{[^}]*background:\s*var\(--brand-jelly-surface\);[^}]*backdrop-filter:\s*var\(--jelly-glass-filter\);/s,
  );
  assert.match(styles, /\.brand-jelly--sea\s*\{[^}]*--brand-jelly-surface:\s*var\(--brand-jelly-sea-surface\)/s);
  assert.match(styles, /\.brand-jelly--page\s*\{[^}]*--brand-jelly-surface:\s*var\(--brand-jelly-page-surface\)/s);
  assert.match(styles, /\.brand-jelly--panel\s*\{[^}]*--brand-jelly-surface:\s*var\(--brand-jelly-panel-surface\)/s);
  assert.match(
    styles,
    /\.brand-jelly--panel\s*\{[^}]*--brand-jelly-glint-opacity:\s*var\(--brand-jelly-panel-glint-opacity\)/s,
  );
  assert.match(styles, /--sea-jelly-surface:\s*rgb\(255 248 237 \/ 88%\);/);
  assert.equal(
    (styles.match(/--brand-jelly-sea-surface:\s*var\(--sea-jelly-surface\);/g) ?? []).length,
    3,
  );
  assert.equal(
    (styles.match(/--brand-jelly-page-surface:\s*var\(--paper\);/g) ?? []).length,
    2,
  );
  assert.equal(
    (styles.match(/--brand-jelly-page-glint-opacity:\s*0;/g) ?? []).length,
    1,
  );
  assert.equal(
    (styles.match(/--brand-jelly-panel-surface:\s*var\(--paper\);/g) ?? []).length,
    2,
  );
  assert.equal(
    (styles.match(/--brand-jelly-panel-glint-opacity:\s*0;/g) ?? []).length,
    1,
  );
  assert.match(
    styles,
    /\.brand-jelly--page\s*\{[^}]*--brand-jelly-glint-opacity:\s*var\(--brand-jelly-page-glint-opacity\);[^}]*--brand-jelly-local-shadow:\s*var\(--brand-jelly-page-shadow\);/s,
  );
  assert.doesNotMatch(styles, /rgb\(146 193 208 \/ 58%\)/);
  assert.doesNotMatch(styles, /rgb\(200 220 228 \/ 4%\)/);
  assert.doesNotMatch(styles, /--jelly-glass-brand-surface/);
  assert.doesNotMatch(styles, /source-hero__mobile-jelly|source-hero-jelly-(?:depth|rim)/);
  assert.doesNotMatch(styles, /source-hero-jelly|brand-jelly-(?:body|filter)/);
  assert.doesNotMatch(styles, /a\.source-brand:hover img|a\.site-menu__brand:hover img/);
  assert.match(
    styles,
    /\.source-button--hero-primary\s*\{[^}]*background:\s*var\(--sea-jelly-surface\);[^}]*backdrop-filter:\s*var\(--jelly-glass-filter\);/s,
  );
  assert.match(styles, /\.brand-jelly > img\s*\{[^}]*filter:\s*none;/s);
  const pathData = (svg) => [...svg.matchAll(/<path(?: id="[^"]+")? d="([^"]*)"/g)].map(
    (match) => match[1],
  );
  const logoPairs = [
    ["logo-redrawn.svg", "logo-redrawn-sea.svg", "#004f91", /#fff(?:fff)?/i],
    ["logo-redrawn-night.svg", "logo-redrawn-sea-night.svg", "#0e202b", /#b8c2c8/i],
  ];
  for (const [sourceName, seaName, ink, removedBase] of logoPairs) {
    const source = await readFile(new URL(`../assets/${sourceName}`, import.meta.url), "utf8");
    const sea = await readFile(new URL(`../assets/${seaName}`, import.meta.url), "utf8");
    assert.deepEqual(pathData(sea), pathData(source));
    assert.match(sea, new RegExp(`fill="${ink}"`));
    assert.doesNotMatch(sea, removedBase);
    assert.match(sea, /mask id="ink-cutouts"/);
    assert.match(sea, /mask="url\(#ink-cutouts\)"/);
  }
  const jellyMask = await readFile(
    new URL("../assets/logo-redrawn-jelly-mask.svg", import.meta.url),
    "utf8",
  );
  assert.deepEqual(pathData(jellyMask), pathData(sourceLogo));
  assert.match(jellyMask, /fill="#ffffff"/);
  assert.doesNotMatch(jellyMask, /fill="#004f91"/);
});

test("the unaccepted squid draft stays isolated from the live jelly logo", () => {
  assert.doesNotMatch(catalogPage, /data-logo-squid|logo-catch-squid/);
  assert.doesNotMatch(styles, /data-logo-variant="squid"|logo-catch-squid/);
  assert.match(catalogPage, /initialCatalogQuery[\s\S]*?includes\("кальмар"\)/);
  assert.match(catalogScript, /normalize\(query\)\.includes\("кальмар"\) \? "squid" : ""/);
  assert.match(catalogScript, /seledkin:logovariantchange/);
  assert.match(themeScript, /root\.dataset\.logoVariant/);
  assert.match(themeScript, /const variantKey =[\s\S]*?logo\$\{variant\.charAt/);
  assert.match(themeScript, /seledkin:logovariantchange/);
  for (const logo of [squidLogo, squidNightLogo]) {
    assert.match(logo, /id="accepted-logo-source"/);
    assert.match(logo, /id="locked-logo-base" data-layer="locked-base"/);
    assert.match(logo, /id="replaceable-product" data-product="commanderskiy-squid"/);
    assert.match(logo, /id="locked-hand-and-sleeve-layer" data-layer="locked-hand"/);
    assert.equal((logo.match(/<image /g) ?? []).length, 0);
    assert.equal((logo.match(/<use href="#accepted-logo-source"\/>/g) ?? []).length, 2);
    assert.ok(Buffer.byteLength(logo) < 300_000);
  }
  assert.match(squidLogo, /id="squid-mantle"/);
  assert.match(squidNightLogo, /fill="#b8c2c8"/);
  assert.doesNotMatch(squidNightLogo, /#fff(?:fff)?/i);
});

test("Night Watch keeps bioluminescence in a restrained, static wake", () => {
  const lightRoot = styles.match(/:root\s*\{([^}]*)\}/s)?.[1] ?? "";
  const explicitDark =
    styles.match(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/s)?.[1] ?? "";

  assert.match(lightRoot, /--bioluminescence-opacity:\s*0;/);
  assert.match(lightRoot, /--bioluminescence-display:\s*none;/);
  assert.match(explicitDark, /--bioluminescence-opacity:\s*0\.72;/);
  assert.match(explicitDark, /--bioluminescence-display:\s*block;/);
  assert.match(
    explicitDark,
    /--bioluminescence-wake:\s*rgb\(82 190 191 \/ 14%\);/,
  );
  assert.match(
    styles,
    /\.source-footer::after,[\s\S]*?\.site-menu__service::after\s*\{[\s\S]*?mix-blend-mode:\s*screen;[\s\S]*?opacity:\s*var\(--bioluminescence-opacity\);/,
  );
  assert.match(
    styles,
    /\.source-footer::after,[\s\S]*?\.site-menu__service::after\s*\{[\s\S]*?var\(--bioluminescence-spark\)/,
  );
  assert.doesNotMatch(styles, /@keyframes\s+(?:bio|glow|spark|plankton)/i);
  assert.doesNotMatch(styles, /\.source-button[^}]*bioluminescence/s);
});

test("WCAG 2.2 AA is a mechanical project contract", () => {
  for (const requirement of [
    "WCAG 2.2 AA",
    "4.5:1",
    "3:1",
    "44 × 44",
    "200%",
    "320 CSS-пикселей",
    "forced-colors",
  ]) {
    assert.match(accessibility, new RegExp(requirement.replace(".", "\\.")));
  }

  for (const page of [home, catalogPage, notFoundPage]) {
    assert.match(page, /<html lang="ru">/);
    assert.equal((page.match(/<main\b/g) ?? []).length, 1);
    assert.equal((page.match(/<h1\b/g) ?? []).length, 1);
    for (const image of page.match(/<img\b[^>]*>/gs) ?? []) {
      assert.match(image, /\salt="[^"]*"/);
    }
  }

  assert.match(catalogPage, /role="status"/);
  assert.match(catalogPage, /role="group"/);
  assert.match(styles, /--telegram:\s*#006d9d/);
  assert.match(styles, /--whatsapp:\s*#137a3d/);
  assert.match(styles, /--text-link:\s*#246f55/);
  assert.match(styles, /--focus:\s*#a35d00/);
  assert.match(styles, /--footer:\s*#073d55/);
  assert.match(styles, /--footer-surface:\s*#0b6a84/);
  assert.match(styles, /--footer-text:\s*#fff8ed/);
  assert.match(styles, /--footer-muted:\s*#dce9e8/);
  assert.match(styles, /--footer:\s*#061a26/);
  assert.match(styles, /--footer-surface:\s*#0a4053/);

  for (const [foreground, background, minimum] of [
    ["#006d9d", "#ffffff", 4.5],
    ["#137a3d", "#ffffff", 4.5],
    ["#246f55", "#ffffff", 4.5],
    ["#696969", "#ffffff", 4.5],
    ["#a35d00", "#ffffff", 3],
    ["#ffc15c", "#0e202b", 3],
    ["#8a6b2f", "#ffffff", 3],
    ["#ffffff", "#707070", 4.5],
    ["#fff8ed", "#0b6a84", 4.5],
    ["#dce9e8", "#0b6a84", 4.5],
    ["#f3ede2", "#0a4053", 4.5],
    ["#d3ccc0", "#0a4053", 4.5],
    ["#b8c2c8", "#0a4053", 4.5],
  ]) {
    assert.ok(
      contrast(foreground, background) >= minimum,
      `${foreground} on ${background} must reach ${minimum}:1`,
    );
  }
});

test("the agreed source assets stay unchanged", async () => {
  const files = [
    [
      "../assets/logo-redrawn.svg",
      "49c8d097b56bd670cf46541b19e34f9c89398b7e566110acddd09067c223cc55",
    ],
    [
      "../assets/salmon-cat.jpg",
      "b12d7f749f2bffbfc1ee92dc10d18f050badaaebd8b851708e2b7dd9a625f1bd",
    ],
    [
      "../assets/fish-pattern.svg",
      "31e51adac566e3b0d5cb43858e6e3d4cf1bcd464be08ff629f49fc1ca707625b",
    ],
    [
      "../assets/hero-sea.mp4",
      "4bd39c26bc86951039361f50508b9b5e2c486460c1ea6b2a919a502097baf232",
    ],
    [
      "../assets/journal-679.jpg",
      "68d2d55db0dc116bf94c58d99d56b306aec7dae77b9e6b899aa09ff2c0e2f166",
    ],
    [
      "../assets/journal-680.jpg",
      "4c585dfc8d94f59a135ce44bce88e1d461dd6df8b75b1bceb6890e6b6df266e7",
    ],
    [
      "../assets/journal-681.jpg",
      "0e48aaa7c67d2a6687cbe5d4ab6a8f56f2f18536811ddae40d7cd13565fbee2c",
    ],
    [
      "../assets/journal-682.jpg",
      "ce166cf12eb8616f7e0777ef042d71882fe0f56f809b7162aac3c32a32f9a277",
    ],
  ];

  for (const [path, expected] of files) {
    const binary = await readFile(new URL(path, import.meta.url));
    assert.equal(createHash("sha256").update(binary).digest("hex"), expected);
  }
});

test("main and catalog publish Pages-native social metadata", () => {
  const root = "https://anton-gorokhovatsky.github.io/seledkin/";
  const image = root + "assets/share-card-primary.jpg";
  const imageAlt =
    "Свежая рыба со специями и логотип Рыбной лавки капитана Селедкина";
  const pages = [
    {
      html: home,
      url: root,
      title:
        "Рыба и морепродукты в Москве — Рыбная лавка капитана Селедкина",
      description:
        "Качественная рыба на каждый день, морепродукты, икра и рыбные деликатесы в Москве рядом с метро «Вавиловская».",
    },
    {
      html: catalogPage,
      url: root + "catalog/",
      title: "Каталог и цены — Рыбная лавка капитана Селедкина",
      description:
        "Полный каталог Рыбной лавки капитана Селедкина: рыба, морепродукты, икра и деликатесы с действующими ценами.",
    },
  ];

  for (const { html, url, title, description } of pages) {
    const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? "";
    const escapedDescription = description.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(
      head,
      new RegExp(
        `name="description"[\\s\\S]{0,180}content="${escapedDescription}"`,
      ),
    );
    for (const tag of [
      `<title>${title}</title>`,
      `<link rel="canonical" href="${url}" />`,
      '<meta property="og:type" content="website" />',
      '<meta property="og:locale" content="ru_RU" />',
      '<meta property="og:site_name" content="Рыбная лавка капитана Селедкина" />',
      `<meta property="og:title" content="${title}" />`,
      `<meta property="og:description" content="${description}" />`,
      `<meta property="og:url" content="${url}" />`,
      `<meta property="og:image" content="${image}" />`,
      '<meta property="og:image:type" content="image/jpeg" />',
      '<meta property="og:image:width" content="1200" />',
      '<meta property="og:image:height" content="630" />',
      `<meta property="og:image:alt" content="${imageAlt}" />`,
      '<meta name="twitter:card" content="summary_large_image" />',
      `<meta name="twitter:title" content="${title}" />`,
      `<meta name="twitter:description" content="${description}" />`,
      `<meta name="twitter:image" content="${image}" />`,
      `<meta name="twitter:image:alt" content="${imageAlt}" />`,
    ]) {
      assert.ok(head.includes(tag), `Нет метатега: ${tag}`);
    }
  }

  assert.deepEqual(jpegDimensions(shareCard), { width: 1200, height: 630 });
  assert.ok(shareCard.byteLength > 100_000);
  assert.ok(shareCard.byteLength < 500_000);
  assert.match(shareCardSource, /width="1200"/);
  assert.match(shareCardSource, /height="630"/);
  assert.match(shareCardSource, /href="about-main\.jpg"/);
  assert.match(shareCardSource, /href="logo-redrawn\.svg"/);
  assert.doesNotMatch(shareCardSource, /logo-redrawn-night\.svg/);
  assert.match(shareCardSource, /fill="#ffffff"/);
  assert.doesNotMatch(home + catalogPage, /https:\/\/ks\.fish\//);
  assert.ok(home.includes(`"url": "${root}"`));
  assert.ok(home.includes(`"image": "${image}"`));
});
