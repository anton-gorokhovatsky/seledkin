import { readFileSync, writeFileSync } from "node:fs";
import { entries, renderMenu, renderFooter, renderTheme, renderJournal, contactAddress } from "./site-content.mjs";

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
  });
  if (page === "journal") regions["journal-archive"] = renderJournal(entries, "archive");
  let result = original;
  for (const [key, content] of Object.entries(regions)) {
    const pattern = new RegExp(`(<!-- shared:${key}:start -->)[\\s\\S]*?(<!-- shared:${key}:end -->)`, "g");
    if ([...result.matchAll(pattern)].length !== 1) throw new Error(`${path}: expected one generated region ${key}`);
    result = result.replace(pattern, (_, start, end) => key === "contact-address"
      ? `${start}${content}${end}` : `${start}\n${content}\n${end}`);
  }
  if (process.argv.includes("--check")) {
    if (result !== original) {
      console.error(`${path}: общие блоки не совпадают с источниками. Выполните pnpm build:site.`);
      process.exitCode = 1;
    }
  } else if (result !== original) writeFileSync(file, result);
}
