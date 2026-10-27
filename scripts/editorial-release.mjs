// Content-only publication boundaries. Runtime, templates and unrelated media
// always keep their normal checks; generated files are verified before release.
export const editorialPhoto = /^journal-(\d+)(?:-\d+)?\.(?:jpg|jpeg|png|webp)$/;
const sourceBody = /^content\/journal\/(\d+)\.html$/;
const storyPage = /^(?:journal|recipes)\/(\d+)\/index\.html$/;
const sourceFile = /^(?:content\/journal\.json|content\/recipes\.json|content\/journal\/\d+\.html)$/;
function safeBody(html) {
  if (/<!--|<!doctype|<\?/i.test(html)) return false;
  const tags = new Set(["p", "br", "a", "strong", "em", "b", "i", "u", "s", "ul", "ol", "li", "blockquote", "span"]);
  for (const [, closing, rawTag, rawAttributes] of html.matchAll(/<(\/?)([a-z][\w-]*)([^>]*)>/gi)) {
    const tag = rawTag.toLowerCase();
    if (!tags.has(tag)) return false;
    let valid = true;
    const attributes = rawAttributes.replace(/\/\s*$/, "").replace(/\s+([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g, (_, key, a, b) => {
      const value = a ?? b;
      if (closing) valid = false;
      else if (key === "class" && tag === "p") valid &&= value.split(/\s+/).every(name => ["journal-tags", "journal-source-signature", "journal-historical-contacts"].includes(name));
      else if (key === "href" && tag === "a") valid &&= /^(?:https?:\/\/|tel:|mailto:|#)/i.test(value);
      else if (key === "cite" && tag === "blockquote") valid &&= /^https?:\/\//i.test(value);
      else if (key === "rel" && tag === "a") valid &&= value.split(/\s+/).every(name => ["noopener", "noreferrer", "nofollow"].includes(name));
      else if (key === "target" && tag === "a") valid &&= ["_blank", "_self"].includes(value);
      else valid = false;
      return "";
    });
    if (!valid || attributes.trim()) return false;
  }
  return true;
}
const parsed = (text, fallback) => text == null ? fallback : JSON.parse(text);
const stable = value => JSON.stringify(value, (_, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);

function changedRecords(before, after) {
  const old = new Map(before.map(item => [String(item.id), stable(item)]));
  if (before.some(item => !after.some(next => String(next.id) === String(item.id)))) throw new Error("Publication removal is not a content publication");
  if (stable([...old.keys()]) !== stable(after.filter(item => old.has(String(item.id))).map(item => String(item.id)))) {
    throw new Error("Reordering existing publications is not a new publication");
  }
  return after.filter(item => old.get(String(item.id)) !== stable(item)).map(item => String(item.id));
}

export function editorialReleaseIds(changes) {
  if (!changes) return [];
  const ids = new Set();
  for (const { path, before, after } of changes) {
    const body = path.match(sourceBody), photo = path.startsWith("assets/") && path.slice(7).match(editorialPhoto);
    if (body || photo) ids.add((body || photo)[1]);
    if (path === "content/journal.json") {
      changedRecords(parsed(before, []), parsed(after, [])).forEach(id => ids.add(id));
    } else if (path === "content/recipes.json") {
      const a = parsed(before, {}), b = parsed(after, {});
      const other = value => stable(Object.fromEntries(Object.entries(value).filter(([key]) => !["recipes", "editorial"].includes(key))));
      if (other(a) !== other(b)) throw new Error("Unknown recipe configuration change");
      for (const key of ["recipes", "editorial"]) changedRecords(a[key] ?? [], b[key] ?? []).forEach(id => ids.add(id));
    }
  }
  return [...ids].sort((a, b) => Number(b) - Number(a));
}

// Accept literal product data, never changed JS expressions or module code.
export function catalogDataChanges(before, after) {
  const parse = source => {
    const records = new Map(), order = [];
    const categories = [...source.matchAll(/^\s*slug:\s*"([^"]+)",/gm)];
    const scaffold = source.replace(/^\s*item\((.*)\),\r?\n/gm, (_, args, offset) => {
      const row = JSON.parse(`[${args}]`);
      if (row.length < 4 || row.length > 6 || typeof row[0] !== "string" || records.has(row[0])) throw new Error("Invalid product row");
      records.set(row[0], row);
      order.push([row[0], categories.findLast(header => header.index < offset)?.[1] ?? null]);
      return "";
    });
    if (!records.size) throw new Error("No literal catalog rows");
    return { records, scaffold, order };
  };
  try {
    const old = parse(before), next = parse(after);
    if (old.scaffold !== next.scaffold || [...old.records.keys()].some(id => !next.records.has(id))) return null;
    if (stable(old.order) !== stable(next.order.filter(([id]) => old.records.has(id)))) return null;
    return [...next.records].filter(([id, row]) => stable(old.records.get(id)) !== stable(row)).map(([id]) => id);
  } catch { return null; }
}

function outsideRegions(html, names, prefix = "shared:") {
  for (const name of names) {
    const pattern = new RegExp(`<!-- ${prefix}${name}:start -->[\\s\\S]*?<!-- ${prefix}${name}:end -->`, "g");
    const count = [...html.matchAll(pattern)].length;
    if (count > 1) return null;
    html = html.replace(pattern, `<!-- ${prefix}${name} -->`);
  }
  return html;
}

export function editorialOnly(changes) {
  if (!changes?.some(({ path }) => sourceFile.test(path))) return false;
  try {
    const ids = editorialReleaseIds(changes);
    if (!ids.length || ids.some(id => !/^\d+$/.test(id))) return false;
    const metadata = changes.find(change => change.path === "content/journal.json");
    const known = new Set(metadata ? parsed(metadata.after, []).map(entry => String(entry.id)) : ids);
    const catalogChange = changes.find(change => change.path === "assets/catalog-data.js");
    const recipeChange = changes.some(change => change.path === "content/recipes.json");
    return changes.every(({ path, before, after }) => {
      if (/^(?:tests\/|docs\/|[^/]+\.md$)/.test(path)) return true;
      if (sourceFile.test(path)) return after != null && (!sourceBody.test(path) || safeBody(after));
      if (path === "assets/catalog-data.js") return catalogDataChanges(before, after) !== null;
      const photo = path.startsWith("assets/") && path.slice(7).match(editorialPhoto);
      if (photo) return ids.includes(photo[1]) && after !== null;
      const story = path.match(storyPage);
      if (story) return known.has(story[1]) && after != null && (before != null || ids.includes(story[1]));
      if (path === "assets/media-variants.json") {
        const unchanged = value => JSON.stringify(JSON.parse(value).filter(item => {
          const photo = item.file.match(editorialPhoto);
          return !photo || !ids.includes(photo[1]);
        }));
        return unchanged(before) === unchanged(after);
      }
      if (path === "sitemap.xml") {
        const articles = /\s*<url>\s*<loc>https:\/\/ks\.fish\/(?:journal|recipes)\/\d+\/<\/loc>\s*<\/url>/g;
        return before != null && after != null && before.replace(articles, "") === after.replace(articles, "");
      }
      if (path === "recipes/index.html") return recipeChange && before != null && after != null;
      const regions = {
        "index.html": ["journal-hero", "journal-hero-products", "journal-preview", ...(recipeChange ? ["recipe-home"] : []), ...(catalogChange ? ["price-preview", "assortment-directory"] : [])],
        "catalog/index.html": ["journal-search"],
        "journal/index.html": ["journal-archive"],
      }[path];
      if (!regions || before == null || after == null) return false;
      const strip = value => {
        let html = outsideRegions(value, regions);
        if (html == null) return null;
        if (path === "catalog/index.html" && (catalogChange || recipeChange)) html = outsideRegions(html, ["products"], "catalog-");
        if (catalogChange && path === "index.html") html = html.replace(/[\d\s\u00a0]+позици(?:я|и|й) в\s+полном каталоге/, "POSITION_COUNT");
        if (catalogChange && path === "catalog/index.html") html = html.replace(/(data-catalog-count>\s*)[\d\s\u00a0]+позици(?:я|и|й)/, "$1POSITION_COUNT");
        return html;
      };
      const outside = strip(before);
      return outside != null && outside === strip(after);
    });
  } catch { return false; }
}
