import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function fail(message) {
  failures.push(message);
}

function relative(path) {
  return path.slice(root.length + 1);
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", "node_modules", "_site"].includes(entry.name)) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const requiredFiles = [
  "index.html",
  "404.html",
  ".nojekyll",
  "catalog/index.html",
  "catalog/catalog.js",
  "ACCESSIBILITY.md",
  "assets/styles.css",
  "assets/site.js",
  "assets/theme.js",
  "assets/typography.js",
  "assets/catalog-data.js",
  "assets/logo-redrawn.svg",
  "assets/logo-redrawn-night.svg",
  "assets/logo-redrawn-sea.svg",
  "assets/logo-redrawn-sea-night.svg",
  "assets/logo-redrawn-jelly-mask.svg",
  "assets/social-icons.svg",
  "assets/salmon-cat.jpg",
  "assets/hero-ocean.jpg",
  "assets/hero-sea.mp4",
  "assets/hero-sea-poster.webp",
  "assets/hero-sea-night.mp4",
  "assets/hero-sea-night-poster.jpg",
  "assets/hero-sea-night.manifest.json",
  "assets/hero-sea-night.provenance.md",
  "assets/caviar-slab.jpg",
  "assets/salmon-dish.jpg",
  "assets/caviar-close.jpg",
  "assets/flounder.jpg",
  "assets/salmon-fillet.jpg",
  "assets/about-main.jpg",
  "assets/about-small-1.jpg",
  "assets/about-small-2.jpg",
  "assets/gallery-large.jpg",
  "assets/gallery-small-1.jpg",
  "assets/gallery-small-2.jpg",
  "assets/gallery-small-3.jpg",
  "assets/gallery-small-4.jpg",
  "assets/cutting-tuna.jpg",
  "assets/quote-pan.jpg",
  "assets/oleg-gugunava.jpg",
  "assets/delivery-basket.jpg",
  "assets/journal-679.jpg",
  "assets/journal-680.jpg",
  "assets/journal-681.jpg",
  "assets/journal-682.jpg",
  "assets/fish-pattern.svg",
];

for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`Нет обязательного файла: ${path}`);
}

const files = walk(root);
const forbiddenExtensions = new Set([".ts", ".tsx", ".jsx"]);
for (const path of files) {
  if (forbiddenExtensions.has(extname(path))) {
    fail(`В статическом проекте остался framework-файл: ${relative(path)}`);
  }
}

const publicSourcePaths = [
  "index.html",
  "404.html",
  "catalog/index.html",
  "catalog/catalog.js",
  "assets/styles.css",
  "assets/site.js",
  "assets/theme.js",
  "assets/typography.js",
  "assets/catalog-data.js",
  "package.json",
];
const source = publicSourcePaths
  .map((path) => `\n--- ${path} ---\n${readFileSync(join(root, path), "utf8")}`)
  .join("");

for (const forbidden of ["next/", "next.js", "react-dom", "from \"react\"", "tildacdn.com"]) {
  if (source.toLowerCase().includes(forbidden.toLowerCase())) {
    fail(`Найдена запрещённая зависимость или внешний исходник: ${forbidden}`);
  }
}

const htmlFiles = ["index.html", "catalog/index.html", "404.html"];
const pageTitles = new Map();
for (const file of htmlFiles) {
  const path = join(root, file);
  const html = readFileSync(path, "utf8");

  if (!/<html\s+lang="ru"/i.test(html)) fail(`${file}: не задан lang="ru"`);
  if (!/<meta\s+name="viewport"/i.test(html)) fail(`${file}: нет viewport`);
  if (/user-scalable\s*=\s*no/i.test(html)) fail(`${file}: запрещено масштабирование`);

  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  if (!title) {
    fail(`${file}: нет содержательного title`);
  } else if (pageTitles.has(title)) {
    fail(`${file}: title повторяет ${pageTitles.get(title)}`);
  } else {
    pageTitles.set(title, file);
  }

  if ((html.match(/<main\b/gi) ?? []).length !== 1) {
    fail(`${file}: должен быть ровно один main`);
  }
  if ((html.match(/<h1\b/gi) ?? []).length !== 1) {
    fail(`${file}: должен быть ровно один h1`);
  }
  if (/<header\b/i.test(html) && !/class="skip-link"/i.test(html)) {
    fail(`${file}: повторяющийся интерфейс требует ссылку пропуска`);
  }
  if (/<(?:input|select|textarea)\b[^>]*aria-label=""/i.test(html)) {
    fail(`${file}: у поля пустое доступное имя`);
  }
  if (/tabindex="[1-9][0-9]*"/i.test(html)) {
    fail(`${file}: запрещён положительный tabindex`);
  }
  if (/\saccesskey=/i.test(html)) {
    fail(`${file}: accesskey может конфликтовать с пользовательскими командами`);
  }
  for (const required of [
    'localStorage.getItem("seledkin-theme")',
    "data-theme-toggle",
    'aria-label="Включить ночную вахту"',
  ]) {
    if (!html.includes(required)) {
      fail(`${file}: нет обязательного поведения темы ${required}`);
    }
  }

  for (const image of html.match(/<img\b[^>]*>/gis) ?? []) {
    if (!/\salt=(?:"[^"]*"|'[^']*')/i.test(image)) {
      fail(`${file}: изображение без alt`);
    }
  }

  for (const frame of html.match(/<iframe\b[^>]*>/gis) ?? []) {
    if (!/\stitle=(?:"[^"]+"|'[^']+')/i.test(frame)) {
      fail(`${file}: iframe без содержательного title`);
    }
  }

  for (const navigation of html.match(/<nav\b[^>]*>/gis) ?? []) {
    if (!/\saria-(?:label|labelledby)=(?:"[^"]+"|'[^']+')/i.test(navigation)) {
      fail(`${file}: nav без уникального доступного имени`);
    }
  }

  if (file !== "404.html") {
    for (const required of [
      'role="dialog"',
      'aria-modal="true"',
      'aria-labelledby="menu-title"',
      'tabindex="-1"',
      'class="site-menu__masthead"',
      'class="site-menu__layout"',
      'class="floating-menu__mark"',
      '<span class="floating-menu__label">Меню</span>',
      "Куда держим курс?",
      "Судовой журнал",
      'class="source-header__bar"',
    ]) {
      if (!html.includes(required)) fail(`${file}: меню или skip-target не содержит ${required}`);
    }
    if ((html.match(/data-menu-toggle/g) ?? []).length !== 1) {
      fail(`${file}: должна быть ровно одна закреплённая кнопка меню`);
    }
    if (/data-menu-close|site-menu__close/.test(html)) {
      fail(`${file}: отдельная кнопка закрытия дублирует управление меню`);
    }
    if (/source-header__top|source-header__address|source-header__action|source-navigation|theme-toggle--header/.test(html)) {
      fail(`${file}: компактная шапка содержит старую дублирующую навигацию`);
    }
  }

  if (file === "index.html") {
    for (const required of [
      "data-hero-video",
      "data-theme-video",
      'poster="assets/hero-sea-poster.webp"',
      'data-poster-dark="assets/hero-sea-night-poster.jpg"',
      'src="assets/hero-sea.mp4"',
      'data-src-dark="assets/hero-sea-night.mp4"',
      'data-logo-light="assets/logo-redrawn-sea.svg"',
      'data-logo-dark="assets/logo-redrawn-sea.svg"',
      'class="source-hero__mobile-brand brand-jelly brand-jelly--sea"',
      'class="source-header source-header--over-media"',
    ]) {
      if (!html.includes(required)) fail(`${file}: первый экран не содержит ${required}`);
    }
  }

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length) {
    fail(`${file}: повторяются id: ${[...new Set(duplicateIds)].join(", ")}`);
  }

  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const reference = match[1];
    if (
      reference.startsWith("#") ||
      /^(?:https?:|tel:|mailto:|data:)/.test(reference)
    ) {
      continue;
    }

    const localPath = decodeURI(reference.split(/[?#]/)[0]);
    if (!localPath) continue;
    let target = resolve(dirname(path), localPath);
    if (localPath.endsWith("/")) target = join(target, "index.html");
    if (!existsSync(target) || (existsSync(target) && statSync(target).isDirectory())) {
      fail(`${file}: не найден локальный ресурс ${reference}`);
    }
  }
}

for (const script of [
  "assets/site.js",
  "assets/theme.js",
  "assets/typography.js",
  "assets/catalog-data.js",
  "catalog/catalog.js",
]) {
  const result = spawnSync(process.execPath, ["--check", join(root, script)], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    fail(`${script}: синтаксическая ошибка\n${result.stderr.trim()}`);
  }
}

const css = readFileSync(join(root, "assets/styles.css"), "utf8");
const openingBraces = css.match(/{/g)?.length ?? 0;
const closingBraces = css.match(/}/g)?.length ?? 0;
if (openingBraces !== closingBraces) {
  fail(`assets/styles.css: несбалансированные скобки (${openingBraces}/${closingBraces})`);
}

for (const required of [
  "@media (prefers-reduced-motion: reduce)",
  "@media (prefers-color-scheme: dark)",
  "@media (prefers-contrast: more)",
  "@media (forced-colors: active)",
  ':root[data-theme="dark"]',
  "--paper: #0e202b",
  "--ink: #f3ede2",
  "--telegram: #006d9d",
  "--whatsapp: #137a3d",
  "--text-link: #246f55",
  "--focus: #a35d00",
  "--footer: #073d55",
  "--footer-surface: #0b6a84",
  "--footer-text: #fff8ed",
  "--footer-muted: #dce9e8",
  "--footer: #061a26",
  "--footer-surface: #0a4053",
  ".site-menu__masthead",
  ".site-menu__layout",
  "height: 100dvh",
  "grid-template-columns: minmax(0, 1.45fr) minmax(22rem, 0.75fr)",
  ".source-header__bar",
  "width: 8.35rem",
  '.floating-menu[aria-expanded="true"] .floating-menu__mark::before',
]) {
  if (!css.includes(required)) fail(`assets/styles.css: нет обязательного правила ${required}`);
}

const siteScript = readFileSync(join(root, "assets/site.js"), "utf8");
for (const required of [
  "element.inert = value",
  'event.key === "Escape"',
  'menuButtonLabel.textContent = "Закрыть"',
  'menuButtonLabel.textContent = "Меню"',
  "menuPanel.scrollTop = 0",
  'window.matchMedia("(prefers-reduced-motion: reduce)")',
  "heroVideo.pause()",
  "heroVideo.currentTime = 0",
  'import "./theme.js"',
]) {
  if (!siteScript.includes(required)) fail(`assets/site.js: нет обязательного поведения ${required}`);
}

const themeScript = readFileSync(join(root, "assets/theme.js"), "utf8");
for (const required of [
  'export const themeStorageKey = "seledkin-theme"',
  'export const storeTimeZone = "Europe/Moscow"',
  'window.matchMedia("(prefers-color-scheme: dark)")',
  "localStorage.setItem(themeStorageKey, explicitTheme)",
  "scheduledTheme(new Date())",
  "scheduleNextShift()",
  '"Дневная вахта"',
  '"Ночная вахта"',
]) {
  if (!themeScript.includes(required)) {
    fail(`assets/theme.js: нет обязательного поведения ${required}`);
  }
}

const catalogPage = readFileSync(join(root, "catalog/index.html"), "utf8");
for (const required of ['role="status"', 'aria-live="polite"', 'role="group"']) {
  if (!catalogPage.includes(required)) fail(`catalog/index.html: нет обязательной семантики ${required}`);
}

const homePage = readFileSync(join(root, "index.html"), "utf8");
if ((homePage.match(/<article class="ship-log-entry"/g) ?? []).length !== 4) {
  fail("index.html: «Судовой журнал» должен содержать четыре отобранные записи");
}
for (const id of [682, 681, 680, 679]) {
  for (const required of [
    `assets/journal-${id}.jpg`,
    `https://t.me/kapitanseledkin/${id}`,
  ]) {
    if (!homePage.includes(required)) {
      fail(`index.html: в «Судовом журнале» нет ${required}`);
    }
  }
}
if (!homePage.includes("https://t.me/kapitanseledkin")) {
  fail("index.html: нет ссылки на весь авторский телеграм-канал");
}

for (const [file, page] of [
  ["index.html", homePage],
  ["catalog/index.html", catalogPage],
]) {
  for (const required of [
    'class="source-footer__portrait"',
    "Лосось на вахте — заходите в лавку",
    "Каждый день с&nbsp;11:00 до&nbsp;20:00",
    "Позвонить",
    "href=\"tel:+79166751452\"",
    "метро",
    "«Вавиловская»",
    "Заказать в Телеграме",
    "Заказать в WhatsApp",
    "<span>Телеграм-канал</span>",
    "<span>YouTube</span>",
    "<span>SoundCloud</span>",
    'class="site-menu__actions"',
    'class="site-menu__networks"',
    "<strong>Телеграм-канал</strong>",
    "social-icons.svg#youtube",
    "social-icons.svg#soundcloud",
    "https://t.me/+79166751452",
    "https://wa.me/79166751452",
  ]) {
    if (!page.includes(required)) {
      fail(`${file}: содержательный подвал не содержит ${required}`);
    }
  }
  if (/floating-chat|floatingChat/.test(page)) {
    fail(`${file}: отдельный чат-виджет дублирует контакты в меню`);
  }
  const socialNavigation =
    page.match(/<nav class="source-footer__channels"[\s\S]*?<\/nav>/)?.[0] ?? "";
  if (/WhatsApp|social-icons\.svg#whatsapp/.test(socialNavigation)) {
    fail(`${file}: WhatsApp ошибочно показан как социальная сеть`);
  }
}

if (/floating-chat|floatingChat/.test(siteScript + css)) {
  fail("CSS или JavaScript всё ещё содержит удалённый чат-виджет");
}

const accessibility = readFileSync(join(root, "ACCESSIBILITY.md"), "utf8");
for (const required of [
  "WCAG 2.2 AA",
  "4.5:1",
  "3:1",
  "44 × 44",
  "200%",
  "320 CSS-пикселей",
  "forced-colors",
]) {
  if (!accessibility.includes(required)) fail(`ACCESSIBILITY.md: нет обязательного правила ${required}`);
}

for (const match of css.matchAll(/url\(["']?([^"'()]+)["']?\)/g)) {
  const reference = match[1];
  if (/^(?:https?:|data:)/.test(reference)) continue;

  const target = resolve(join(root, "assets"), reference);
  if (!existsSync(target)) {
    fail(`assets/styles.css: не найден локальный ресурс ${reference}`);
  }
}

const catRule =
  css.match(/\.source-footer__portrait\s+img\s*\{([^}]*)\}/s)?.[1] ?? "";
if (!/height\s*:\s*auto/i.test(catRule) || /object-fit\s*:\s*cover/i.test(catRule)) {
  fail("Портрет кота Лосося в подвале должен сохранять исходную композицию");
}

const expectedHashes = new Map([
  [
    "assets/logo-redrawn.svg",
    "49c8d097b56bd670cf46541b19e34f9c89398b7e566110acddd09067c223cc55",
  ],
  [
    "assets/social-icons.svg",
    "4134ef4ba0dd886fc675c76441ba241bdeb3453c7b9d4f1b453b981f7ebb3eb9",
  ],
  [
    "assets/salmon-cat.jpg",
    "b12d7f749f2bffbfc1ee92dc10d18f050badaaebd8b851708e2b7dd9a625f1bd",
  ],
  [
    "assets/fish-pattern.svg",
    "31e51adac566e3b0d5cb43858e6e3d4cf1bcd464be08ff629f49fc1ca707625b",
  ],
  [
    "assets/journal-679.jpg",
    "68d2d55db0dc116bf94c58d99d56b306aec7dae77b9e6b899aa09ff2c0e2f166",
  ],
  [
    "assets/journal-680.jpg",
    "4c585dfc8d94f59a135ce44bce88e1d461dd6df8b75b1bceb6890e6b6df266e7",
  ],
  [
    "assets/journal-681.jpg",
    "0e48aaa7c67d2a6687cbe5d4ab6a8f56f2f18536811ddae40d7cd13565fbee2c",
  ],
  [
    "assets/journal-682.jpg",
    "ce166cf12eb8616f7e0777ef042d71882fe0f56f809b7162aac3c32a32f9a277",
  ],
]);

for (const [path, expected] of expectedHashes) {
  if (existsSync(join(root, path)) && sha256(join(root, path)) !== expected) {
    fail(`${path}: файл отличается от согласованного оригинала`);
  }
}

const sourceLogo = readFileSync(join(root, "assets/logo-redrawn.svg"), "utf8");
const nightLogo = readFileSync(join(root, "assets/logo-redrawn-night.svg"), "utf8");
for (const layer of [
  'id="logo-night-base"',
  'fill="#b8c2c8"',
  'id="logo-night-shadows"',
  'fill="#0e202b"',
  'id="logo-night-board-1"',
  'id="logo-night-board-2"',
  'id="logo-night-wordmark-1" fill="#0e202b"',
  'id="logo-night-wordmark-2" fill="#0e202b"',
]) {
  if (!nightLogo.includes(layer)) {
    fail(`В ночном логотипе отсутствует слой обратной полярности: ${layer}`);
  }
}
if (/#fff(?:fff)?|filter=|invert\(/i.test(nightLogo)) {
  fail("Ночной логотип не должен использовать белые плашки или фильтр-инверсию");
}
if (/clipPath|clip-path/i.test(nightLogo)) {
  fail("Ночной логотип не должен вырезать прямоугольную подложку под надписью");
}
const sourceLogoPaths = [...sourceLogo.matchAll(/<path d="([^"]*)"/g)].map(
  (match) => match[1],
);
const nightLogoPaths = [...nightLogo.matchAll(/<path(?: id="[^"]+")? d="([^"]*)"/g)].map(
  (match) => match[1],
);
if (
  sourceLogoPaths.length !== nightLogoPaths.length ||
  sourceLogoPaths.some((path, index) => path !== nightLogoPaths[index])
) {
  fail("Ночной логотип должен сохранять всю исходную векторную геометрию");
}

const socialIcons = readFileSync(join(root, "assets/social-icons.svg"), "utf8");
for (const id of ["telegram", "whatsapp", "youtube", "soundcloud"]) {
  if (!socialIcons.includes(`<symbol id="${id}" viewBox="0 0 24 24">`)) {
    fail(`В локальном SVG-спрайте нет значка ${id}`);
  }
}

if (failures.length) {
  console.error(failures.map((message) => `- ${message}`).join("\n"));
  process.exit(1);
}

console.log(
  `Статический gate пройден: ${requiredFiles.length} обязательных файлов, ${htmlFiles.length} HTML-страницы.`,
);
