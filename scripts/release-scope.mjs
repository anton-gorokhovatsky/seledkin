import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Generated public files are checked separately by pnpm lint. Changes to their
// sources cannot use a shorter gate when the generated result changes structure.
const tooling = /^(?:(?:tests|scripts|templates|content|docs|\.github)\/|[^/]+\.md$)/;
const activeContent = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const journalPhoto = /^journal-\d+(?:-\d+)?\.(?:jpg|jpeg|png|webp)$/;
const journalSource = /^content\/journal(?:\.json|\/\d+\.html)$/;
const journalRegions = {
  "index.html": ["journal-hero", "journal-preview"],
  "catalog/index.html": ["journal-search"],
  "journal/index.html": ["journal-archive"],
};

function journalOnly(changes) {
  if (!changes.some(({ path }) => journalSource.test(path))) return false;
  return changes.every(({ path, before, after }) => {
    if (/^(?:tests\/|docs\/|[^/]+\.md$)/.test(path)) return true;
    // Scripts and templates deliberately do not enter this allowlist. Generated
    // pages must also pass the existing generator consistency check in CI.
    if (journalSource.test(path)) return after != null && !/<(?:script|style|iframe|object)\b|\bon\w+\s*=/i.test(after);
    if (path.startsWith("assets/") && journalPhoto.test(path.slice(7))) return true;
    if (/^journal\/\d+\/index\.html$/.test(path)) return after != null;
    if (path === "assets/media-variants.json") {
      try {
        const otherMedia = value => JSON.stringify(JSON.parse(value).filter(item => !journalPhoto.test(item.file)));
        return otherMedia(before) === otherMedia(after);
      } catch { return false; }
    }
    if (path === "sitemap.xml") {
      const articles = /\s*<url>\s*<loc>https:\/\/ks\.fish\/journal\/\d+\/<\/loc>\s*<\/url>/g;
      return before != null && after != null && before.replace(articles, "") === after.replace(articles, "");
    }
    if (!journalRegions[path] || before == null || after == null) return false;
    const strip = html => {
      for (const region of journalRegions[path]) {
        const pattern = new RegExp(`<!-- shared:${region}:start -->[\\s\\S]*?<!-- shared:${region}:end -->`, "g");
        if ([...html.matchAll(pattern)].length !== 1) return null;
        html = html.replace(pattern, `<!-- ${region} -->`);
      }
      return html;
    };
    const outside = strip(before);
    return outside != null && outside === strip(after);
  });
}

function onlyAnchorTargets(before, after) {
  if (before == null || after == null) return false;
  if (JSON.stringify(before.match(activeContent)) !== JSON.stringify(after.match(activeContent))) return false;
  const links = [[], []];
  const normalized = [before, after].map((html, index) => html.replace(
    /(<a\b[^>]*?\shref=)(["'])([^"'<>]*)\2/gi,
    (_, prefix, quote, href) => {
      links[index].push(href);
      return `${prefix}${quote}__LINK_TARGET__${quote}`;
    },
  ));
  return normalized[0] === normalized[1] && links[1].every((href, index) =>
    href === links[0][index] || /^(?:https?:\/\/|mailto:|tel:|[./#?])/i.test(href),
  );
}

function onlyTypography(before, after) {
  if (before == null || after == null) return false;
  // Only discretionary hyphens and nonbreaking spaces in text may differ.
  // Tags, attributes, scripts and styles must remain byte-for-byte identical.
  const tags = /<(?:[^>"']|"[^"]*"|'[^']*')*>/g;
  if (JSON.stringify(before.match(tags)) !== JSON.stringify(after.match(tags))) return false;
  if (JSON.stringify(before.match(activeContent)) !== JSON.stringify(after.match(activeContent))) return false;
  const normalize = html => html.replace(/\u00ad/g, "").replace(/\u00a0/g, " ");
  return normalize(before) === normalize(after);
}

function onlyMenuRoutes(before, after) {
  const regions = [
    [/(<nav aria-label="Меню сайта">)([\s\S]*?)(<\/nav>)/g,
      /<a href="([^"<>]+)"(?: aria-current="page")?>\s*<span aria-hidden="true">\d+<\/span>\s*<span>[^<>]+<\/span>\s*<\/a>/g],
    [/(<nav class="site-navigation-fallback source-shell" id="site-navigation-fallback" aria-label="Разделы сайта" tabindex="-1" data-menu-fallback>)([\s\S]*?)(<\/nav>)/g,
      /<a href="([^"<>]+)"(?: aria-current="page")?>[^<>]+<\/a>/g],
  ];
  const strip = html => {
    for (const [region, links] of regions) {
      let count = 0, valid = true;
      html = html.replace(region, (_, open, content, close) => {
        count++;
        const anchors = [...content.matchAll(links)];
        valid &&= anchors.length > 0 && content.replace(links, "").trim() === ""
          && anchors.every(([, href]) => !/^(?:[a-z]+:|\/\/)|\s/i.test(href));
        return `${open}MENU_ROUTES${close}`;
      });
      if (count !== 1 || !valid) return null;
    }
    return html;
  };
  const outside = strip(before);
  return outside != null && outside === strip(after);
}

function onlyProductTargets(before, after) {
  if (before == null || after == null) return false;
  const targets = [[], []];
  const stripped = [before, after].map((html, index) => html.replace(
    /(\s(?:href|data-href)=)(["'])([^"'<>]*)\2/gi,
    (_, prefix, quote, href) => {
      targets[index].push(href);
      return `${prefix}${quote}PRODUCT_TARGET${quote}`;
    },
  ));
  return stripped[0] === stripped[1] && targets[1].some((href, i) => href !== targets[0][i])
    && targets[1].every((href, i) => {
      if (href === targets[0][i]) return true;
      if (/^(?:[a-z]+:|\/\/)/i.test(href)) return false;
      const old = new URL(targets[0][i].replaceAll("&amp;", "&"), "https://ks.fish/");
      const next = new URL(href.replaceAll("&amp;", "&"), "https://ks.fish/");
      const id = next.searchParams.get("product");
      return old.pathname === "/catalog/" && next.pathname === "/catalog/"
        && /^[a-z0-9-]+$/.test(id ?? "") && next.hash === `#product-${id}`;
    });
}

// A resource version can change without changing the component's public shape.
// Local resource versions belong to publication assembly. Removing a former
// manual version does not change the module or page's customer behaviour.
const resourceVersions = value => value?.replace(/(["'`])([\w./-]+\.(?:css|js)|[\w./-]*store-map\.html)\?v=[\w.-]+(?=\1)/g, "$1$2");
const componentScripts = {
  "assets/author-signature.js": ["@signature"],
  "assets/catalog-data.js": ["@catalog", "@afisha", "@recipes"],
  "assets/mobile-hero.js": ["@afisha"],
  "assets/analytics.js": ["@analytics"],
  "assets/catalog-model.js": ["@catalog", "@afisha", "@recipes"],
  "assets/order-list.js": ["@catalog"],
  "assets/order-store.js": ["@catalog"],
  "assets/order-message.js": ["@catalog"],
  "assets/recipes-directory.js": ["@recipes"],
  "catalog/catalog.js": ["@catalog"],
};

function onlyFooterLayout(before, after) {
  const region = /<!-- shared:footer:start -->[\s\S]*?<!-- shared:footer:end -->|<footer\b[^>]*class="source-footer"[^>]*>[\s\S]*?<\/footer>/g;
  const oldRegions = before.match(region), newRegions = after.match(region);
  if (oldRegions?.length !== 1 || newRegions?.length !== 1
    || before.replace(region, "FOOTER") !== after.replace(region, "FOOTER")) return false;
  if (/\son\w+\s*=|<(?:iframe|object|embed)\b/i.test(newRegions[0])) return false;
  const stable = html => JSON.stringify({
    code: html.match(activeContent),
    targets: [...html.matchAll(/\b(?:href|src|srcset|sizes|aria-label|alt)="[^"]*"/g)].map(match => match[0]).sort(),
    words: html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).sort(),
  });
  return stable(oldRegions[0]) === stable(newRegions[0]);
}

function cssRules(source, context = "", rules = new Map()) {
  if (source == null) throw new Error("Missing CSS comparison");
  source = source.replace(/\/\*[\s\S]*?\*\//g, "");
  let position = 0;
  while (position < source.length) {
    const open = source.indexOf("{", position);
    if (open < 0) {
      if (source.slice(position).trim()) throw new Error("Unknown CSS statement");
      break;
    }
    const selector = source.slice(position, open).trim();
    let depth = 1, quote = "", end = open + 1;
    for (; end < source.length && depth; end++) {
      const char = source[end];
      if (char === "\\") { end++; continue; }
      if (quote) { if (char === quote) quote = ""; continue; }
      if (char === '"' || char === "'") { quote = char; continue; }
      if (char === "{") depth++;
      if (char === "}") depth--;
    }
    if (depth) throw new Error("Unbalanced CSS");
    const body = source.slice(open + 1, end - 1);
    if (/^@(media|supports|container|layer)\b/.test(selector)) cssRules(body, `${context}${selector}/`, rules);
    else {
      const key = `${context}|${selector}`;
      rules.set(key, { selector, body: `${rules.get(key)?.body ?? ""}\n${body}` });
    }
    position = end;
  }
  return rules;
}

function onlyMenuEndPadding(before, after, selector) {
  if (!/^\s*\.site-menu__(?:routes|service-inner)\s*$/.test(selector)) return false;
  const withoutEndPadding = rule => (rule?.body ?? "")
    .replace(/(^|[;\n])\s*padding-bottom\s*:[^;{}]+;/g, "$1")
    .split("\n").map(line => line.trim()).filter(Boolean).join("\n");
  return withoutEndPadding(before) === withoutEndPadding(after);
}

function cssTags(before, after, recipeSheet = false) {
  try {
    const oldRules = cssRules(before), newRules = cssRules(after), tags = new Set();
    for (const key of new Set([...oldRules.keys(), ...newRules.keys()])) {
      if (oldRules.get(key)?.body === newRules.get(key)?.body) continue;
      for (const selector of (newRules.get(key) ?? oldRules.get(key)).selector.split(",")) {
        const tag = onlyMenuEndPadding(oldRules.get(key), newRules.get(key), selector) ? "@navigation"
          : /^\s*\.delivery-waybill__price(?:\s+span)?\s*$/.test(selector) ? "@delivery"
          : /^\s*\.source-footer__(?:base|credit|legal)(?=[\s>.#[:]|$)/.test(selector) ? "@signature"
          : /^\s*\.source-footer__(?:content|details|portrait|postscript|channels)(?=[\s>.#[:]|$)/.test(selector) ? "@footer"
          : recipeSheet && /^\s*(?:\.(?:recipes?-)[\w-]+|\[data-recipe-)[^,]*$/.test(selector) ? "@recipes"
          : /^\s*\.contacts-source(?=[\s_.#[:]|$)/.test(selector) ? "@contacts"
          : /^\s*\.catalog-(?:[\w-]+)(?=[\s.#[:]|$)/.test(selector) ? "@catalog"
          : /^\s*\.(?:journal-historical|recipe-archive-note)(?=[\s_.#[:]|$)/.test(selector) ? "@journal"
          : /^\s*\.afisha(?=[\s_.#[:]|$)/.test(selector) ? "@afisha" : null;
        if (!tag) return null;
        tags.add(tag);
      }
    }
    // Moving otherwise identical rules can change the cascade; be conservative.
    const common = map => [...map.keys()].filter(key => oldRules.has(key) && newRules.has(key));
    if (JSON.stringify(common(oldRules)) !== JSON.stringify(common(newRules))) return null;
    return [...tags];
  } catch { return null; }
}

export function scopedBrowserTags(changes) {
  if (!changes) return null;
  const tags = new Set();
  for (const { path, before, after } of changes) {
    if (tooling.test(path)) continue;
    if (/\.(?:js|html)$/.test(path) && before != null && after != null && resourceVersions(before) === resourceVersions(after)) {
      continue;
    } else if (path === "assets/styles.css") {
      const affected = cssTags(before, after);
      if (!affected) return null;
      affected.forEach(tag => tags.add(tag));
    } else if (["assets/recipes-directory.css", "assets/recipes-editorial.css"].includes(path)) {
      const affected = cssTags(before, after, true);
      if (!affected || affected.some(tag => tag !== "@recipes")) return null;
      affected.forEach(tag => tags.add(tag));
    } else if (componentScripts[path] && after != null) {
      componentScripts[path].forEach(tag => tags.add(tag));
    } else if (path === "assets/site.js" && before != null && resourceVersions(before) === resourceVersions(after)) {
      continue;
    } else if (path.endsWith(".html") && before != null && after != null) {
      const oldHtml = resourceVersions(before), newHtml = resourceVersions(after);
      if (oldHtml === newHtml) continue;
      if (onlyMenuRoutes(oldHtml, newHtml)) { tags.add("@navigation"); continue; }
      if (onlyProductTargets(oldHtml, newHtml)) { tags.add("@catalog"); continue; }
      if (onlyFooterLayout(oldHtml, newHtml)) { tags.add("@footer"); tags.add("@signature"); continue; }
      const region = path === "index.html" ? /<!-- shared:mobile-hero:start -->[\s\S]*?<!-- shared:mobile-hero:end -->/
        : ["catalog/index.html", "recipes/index.html"].includes(path) || /^journal\/\d+\/index\.html$/.test(path) ? /<main\b[^>]*>[\s\S]*?<\/main>/ : null;
      if (!region || !region.test(oldHtml) || !region.test(newHtml)
        || oldHtml.replace(region, "COMPONENT") !== newHtml.replace(region, "COMPONENT")) return null;
      tags.add(path === "index.html" ? "@afisha" : path === "catalog/index.html" ? "@catalog" : path === "recipes/index.html" ? "@recipes" : "@journal");
    } else return null;
  }
  return [...tags].sort();
}

export function classifyRelease(changes) {
  // Unknown comparison bases retain the full gate.
  if (!changes) return "full";
  const published = changes.filter(({ path }) => !tooling.test(path));
  if (!published.length) return "none";
  if (journalOnly(changes)) return "journal";
  if (published.every(({ path, before, after }) => path.endsWith(".html") && onlyTypography(before, after))) return "typography";
  if (published.every(({ path, before, after }) => path.endsWith(".html") && onlyAnchorTargets(before, after))) return "links";
  const tags = scopedBrowserTags(changes);
  return tags?.length ? "scoped" : "full";
}

export function readReleaseChanges(base) {
  if (!/^[a-f0-9]{40}$/i.test(base || "") || /^0+$/.test(base)) return null;
  const git = args => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  try {
    const paths = git(["diff", "--name-only", "--no-renames", "-z", base, "HEAD"]).split("\0").filter(Boolean);
    const content = (ref, path) => {
      try { return git(["show", `${ref}:${path}`]); } catch { return null; }
    };
    return paths.map(path => ({ path, ...(/\.(?:html|json|xml|css|js)$/.test(path)
      ? { before: content(base, path), after: content("HEAD", path) } : {}) }));
  } catch {
    return null;
  }
}

export function selectReleaseChecks(changes, requested = "auto") {
  // A deliberate manual choice for an approved editorial release. Automatic
  // classification remains conservative for unknown changes and missing bases.
  if (requested === "editorial") return { scope: "scoped", grep: "@recipes|@journal" };
  const scope = requested === "full" ? "full" : classifyRelease(changes);
  return { scope, grep: scope === "scoped" ? scopedBrowserTags(changes).join("|") : "" };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const changes = readReleaseChanges(process.argv[2]);
  const { scope, grep } = selectReleaseChecks(changes, process.argv[3]);
  const pages = scope === "typography" ? changes.filter(({ path }) => !tooling.test(path)).map(({ path }) => path) : [];
  const output = `scope=${scope}\nbrowser_required=${["full", "journal", "typography", "scoped"].includes(scope)}\nbrowser_grep=${grep}\ntypography_pages=${JSON.stringify(pages)}\n`;
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, output);
  process.stdout.write(output);
}
