import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Generated public files are checked separately by pnpm lint. Changes to their
// sources cannot use a shorter gate when the generated result changes structure.
const tooling = /^(?:(?:tests|scripts|templates|content|docs|\.github)\/|[^/]+\.md$)/;
const activeContent = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;

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

export function classifyRelease(changes) {
  // Unknown bases and manually requested runs retain the full gate.
  if (!changes) return "full";
  const published = changes.filter(({ path }) => !tooling.test(path));
  if (!published.length) return "none";
  return published.every(({ path, before, after }) => path.endsWith(".html") && onlyAnchorTargets(before, after))
    ? "links" : "full";
}

export function readReleaseChanges(base) {
  if (!/^[a-f0-9]{40}$/i.test(base || "") || /^0+$/.test(base)) return null;
  const git = args => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  try {
    const paths = git(["diff", "--name-only", "--no-renames", "-z", base, "HEAD"]).split("\0").filter(Boolean);
    const content = (ref, path) => {
      try { return git(["show", `${ref}:${path}`]); } catch { return null; }
    };
    return paths.map(path => ({ path, ...(!tooling.test(path) && path.endsWith(".html")
      ? { before: content(base, path), after: content("HEAD", path) } : {}) }));
  } catch {
    return null;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const scope = classifyRelease(readReleaseChanges(process.argv[2]));
  const output = `scope=${scope}\nbrowser_required=${scope === "full"}\n`;
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, output);
  process.stdout.write(output);
}
