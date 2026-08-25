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
  "assets/styles.css",
  "assets/site.js",
  "assets/catalog-data.js",
  "assets/logo-redrawn.svg",
  "assets/salmon-cat.jpg",
  "assets/hero-fish.jpg",
  "assets/oleg-gugunava.jpg",
  "assets/delivery-basket.jpg",
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

if (/object-fit\s*:\s*cover/i.test(source)) {
  fail("Найден object-fit: cover — авторские фотографии нельзя произвольно обрезать");
}

const htmlFiles = ["index.html", "catalog/index.html", "404.html"];
for (const file of htmlFiles) {
  const path = join(root, file);
  const html = readFileSync(path, "utf8");

  if (!/<html\s+lang="ru"/i.test(html)) fail(`${file}: не задан lang="ru"`);
  if (!/<meta\s+name="viewport"/i.test(html)) fail(`${file}: нет viewport`);
  if (/user-scalable\s*=\s*no/i.test(html)) fail(`${file}: запрещено масштабирование`);

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

for (const script of ["assets/site.js", "assets/catalog-data.js", "catalog/catalog.js"]) {
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

const expectedHashes = new Map([
  [
    "assets/logo-redrawn.svg",
    "49c8d097b56bd670cf46541b19e34f9c89398b7e566110acddd09067c223cc55",
  ],
  [
    "assets/salmon-cat.jpg",
    "b12d7f749f2bffbfc1ee92dc10d18f050badaaebd8b851708e2b7dd9a625f1bd",
  ],
]);

for (const [path, expected] of expectedHashes) {
  if (existsSync(join(root, path)) && sha256(join(root, path)) !== expected) {
    fail(`${path}: файл отличается от согласованного оригинала`);
  }
}

if (failures.length) {
  console.error(failures.map((message) => `- ${message}`).join("\n"));
  process.exit(1);
}

console.log(
  `Статический gate пройден: ${requiredFiles.length} обязательных файлов, ${htmlFiles.length} HTML-страницы.`,
);
