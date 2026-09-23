const shortWords =
  /(^|[\s([«„—])(а|без|в|во|да|для|до|за|из|и|к|ко|на|над|не|ни|но|о|об|обо|от|по|под|при|про|с|со|у|я)(?: |\t|\r|\n)+(?=[\p{L}\p{N}«„])/giu;
const crossNodeShortWord =
  /(^|[\s([«„—])(а|без|в|во|да|для|до|за|из|и|к|ко|на|над|не|ни|но|о|об|обо|от|по|под|при|про|с|со|у|я)(?: |\t|\r|\n)*$/iu;
const textContainerSelector =
  "p, h1, h2, h3, h4, h5, h6, li, dt, dd, blockquote, address, label, button, figcaption, time, summary, legend, option";
const excludedSelector = "script, style, svg, code, pre, kbd, samp, textarea, [contenteditable], [data-no-typography]";
const units = /([\d])[ \t\r\n\u00a0\u202f]*(₽|%|(?:кг|мл|г|л|руб\.|рубль|рубля|рублей|грамм|грамма|граммов|килограмм|килограмма|килограммов|позиция|позиции|позиций|раздел|раздела|разделов)(?![\p{L}\p{N}]))/giu;
const monthNames = "января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря";
const dates = new RegExp(`(\\d{1,2})[ \\t\\r\\n\\u00a0]+(${monthNames})(?:[ \\t\\r\\n\\u00a0]+(\\d{4}))?(?![\\p{L}\\p{N}])`, "giu");

function typographProse(value) {
  // Quote nesting is authored context, including quotations across paragraphs.
  let result = value;

  while (true) {
    const next = result.replace(shortWords, "$1$2\u00a0");
    if (next === result) break;
    result = next;
  }

  return result
    .replace(/(\S)[ \t\r\n\u00a0]+[—–-][ \t\r\n\u00a0]+(?=\S|$)/g, "$1\u00a0— ")
    .replace(/(\d{4,})(?=[ \t\u00a0\u202f]*(?:₽|руб(?:\.|ль|ля|лей)(?!\p{L})))/gu,
      number => number.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f"))
    .replace(/(\d)[ \t\u00a0](?=\d{3}(?:\D|$))/g, "$1\u202f")
    .replace(units, "$1\u00a0$2")
    .replace(dates, (_, day, month, year) => `${day}\u00a0${month}${year ? `\u00a0${year}` : ""}`)
    .replace(/(№)[ \t\u00a0]*(?=\d)/g, "$1\u00a0")
    .replace(/(\d)[ \t\u00a0]+из[ \t\u00a0]+(?=\d)/giu, "$1\u00a0из\u00a0")
    .replace(/([\p{L}\p{N}»“])[ \t\r\n]+(бы|же|ли|ль|[бж](?![.\/]))(?!\p{L})/giu, "$1\u00a0$2")
    .replace(
      /(^|[\s,(])(ул|д|корп)\.[ \t\r\n]+(?=\p{L}|\d)/giu,
      "$1$2.\u00a0",
    )
    .replace(/(^|[\s(])(т|ж|ст)\.[ \t\r\n]+(?=(?:ч|д|п|е|б)\.)/giu, "$1$2.\u00a0")
    .replace(/([A-ZА-ЯЁ])\.[ \t\r\n]+(?=[A-ZА-ЯЁ]\.)/gu, "$1.\u00a0")
    .replace(/\+7[ \u00a0\u202f]+(\d{3})[ \u00a0\u202f]+(\d{3})[-‑](\d{2})[-‑](\d{2})/g, "+7\u00a0$1\u00a0$2‑$3‑$4");
}

export function typographText(value) {
  // These can appear as visible link labels; their technical spelling is exact.
  return value.split(/((?:https?:\/\/|www\.)[^\s<>]+|[\w.+-]+@[\w.-]+\.[a-z]{2,})/gi)
    .map((part, index) => index % 2 ? part : typographProse(part)).join("");
}

export function typographPrice(value) {
  return typographText(
    value.replace(/\d{4,}/g, (number) =>
      number.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f"),
    ),
  );
}

function closestTextContainer(node) {
  return node.parentElement?.closest(textContainerSelector)
    ?? node.parentElement?.closest("a, small") ?? null;
}

export function typographDocument(root = document.body) {
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.parentElement?.closest(excludedSelector)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];

  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach((node, index) => {
    node.nodeValue = typographText(node.nodeValue ?? "");

    const match = node.nodeValue.match(crossNodeShortWord);
    if (!match) return;

    const container = closestTextContainer(node);
    const next = nodes.slice(index + 1).find((candidate) => candidate.nodeValue?.trim());
    if (!container || !next || closestTextContainer(next) !== container) return;

    node.nodeValue = node.nodeValue.replace(
      crossNodeShortWord,
      "$1$2\u00a0",
    );
    // Whitespace inside an inline link/emphasis must not restore a break.
    for (let i = index + 1; nodes[i] !== next; i += 1) nodes[i].nodeValue = "";
    next.nodeValue = next.nodeValue.replace(/^[ \t\r\n]+/, "");
  });

  root
    .querySelectorAll("[alt], [aria-label], [title], [placeholder]")
    .forEach((element) => {
      if (element.closest(excludedSelector)) return;
      for (const name of ["alt", "aria-label", "title", "placeholder"]) {
        const value = element.getAttribute(name);
        if (value) element.setAttribute(name, typographText(value));
      }
    });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => typographDocument(), {
      once: true,
    });
  } else {
    typographDocument();
  }
}
