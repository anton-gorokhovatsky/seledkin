import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { entries, renderMenu, renderFooter, renderTheme, renderJournal, renderJournalPage, contactAddress, regularHours, store } from "./site-content.mjs";

// These are explicit editorial selections, not a live or automatic channel feed.
const hero = entries.slice(0, 5);
const preview = entries.slice(0, 3);
const pages = [["index.html", "home", ""], ["catalog/index.html", "catalog", "../"],
  ["about/index.html", "about", "../"], ["journal/index.html", "journal", "../"], ["404.html", "404", ""]];
for (const [path, page, root] of pages) {
  const file = new URL(`../${path}`, import.meta.url);
  const original = readFileSync(file, "utf8");
  const regions = { theme: renderTheme(page) };
  if (page !== "404") Object.assign(regions, { menu: renderMenu(page, root), footer: renderFooter(page, root) });
  if (page === "home") Object.assign(regions, {
    "journal-hero": renderJournal(hero, "hero"), "journal-preview": renderJournal(preview, "preview"),
    "contact-address": contactAddress,
    "contact-hours": regularHours,
  });
  if (page === "journal") regions["journal-archive"] = renderJournal(entries, "archive");
  if (page === "catalog") regions["journal-search"] = renderJournal(entries, "search");
  let result = original;
  for (const [key, content] of Object.entries(regions)) {
    const pattern = new RegExp(`(<!-- shared:${key}:start -->)[\\s\\S]*?(<!-- shared:${key}:end -->)`, "g");
    if ([...result.matchAll(pattern)].length !== 1) throw new Error(`${path}: expected one generated region ${key}`);
    result = result.replace(pattern, (_, start, end) => key === "contact-address" || key === "contact-hours"
      ? `${start}${content}${end}` : `${start}\n${content}\n${end}`);
  }
  if (page === "home") result = result.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/, (_, start, source, end) => {
    const data = JSON.parse(source);
    data.openingHours = `Mo-Su ${store.hours.open}-${store.hours.close}`;
    const exceptions = Object.entries(store.exceptions).map(([date, hours]) => ({
      "@type": "OpeningHoursSpecification", validFrom: date, validThrough: date,
      opens: hours?.open ?? "00:00", closes: hours?.close ?? "00:00",
    }));
    if (exceptions.length) data.specialOpeningHoursSpecification = exceptions;
    else delete data.specialOpeningHoursSpecification;
    return `${start}\n${JSON.stringify(data, null, 2).split("\n").map(line => `      ${line}`).join("\n")}\n    ${end}`;
  });
  if (process.argv.includes("--check")) {
    if (result !== original) {
      console.error(`${path}: общие блоки не совпадают с источниками. Выполните pnpm build:site.`);
      process.exitCode = 1;
    }
  } else if (result !== original) writeFileSync(file, result);
}

function generated(path, content) {
  const file = new URL(`../${path}`, import.meta.url);
  const original = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (process.argv.includes("--check")) {
    if (original !== content) {
      console.error(`${path}: выполните pnpm build:site.`);
      process.exitCode = 1;
    }
  } else if (original !== content) {
    mkdirSync(new URL(".", file), { recursive: true });
    writeFileSync(file, content);
  }
}
generated("assets/store-data.js", `// Generated from content/site.json by pnpm build:site.\nexport const store = ${JSON.stringify(store, null, 2)};\n`);
for (const entry of entries) generated(`journal/${entry.id}/index.html`, renderJournalPage(entry));
const routes = ["", "catalog/", "journal/", "about/", ...entries.map(entry => `journal/${entry.id}/`)];
generated("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(path => `  <url>\n    <loc>https://ks.fish/${path}</loc>\n  </url>`).join("\n")}\n</urlset>\n`);
