const shortWords =
  /(^|[\s([«„—])(а|без|в|во|для|до|за|из|и|к|ко|на|над|не|о|об|от|по|под|при|про|с|со|у|я)(?: |\t|\r|\n)+(?=[\p{L}\p{N}«„])/giu;
const crossNodeShortWord =
  /(^|[\s([«„—])(а|без|в|во|для|до|за|из|и|к|ко|на|над|не|о|об|от|по|под|при|про|с|со|у|я)(?: |\t|\r|\n)*$/iu;
const textContainerSelector =
  "p, h1, h2, h3, h4, h5, h6, li, dt, dd, blockquote, address, small, label, button, a";

export function typographText(value) {
  let result = value.replace(/„([^“]+)“/g, "«$1»");

  while (true) {
    const next = result.replace(shortWords, "$1$2\u00a0");
    if (next === result) break;
    result = next;
  }

  return result
    .replace(/(\d) (?=\d{3}(?:\D|$))/g, "$1\u202f")
    .replace(/(\d) (?=₽|кг|г|л|мл\b)/g, "$1\u00a0")
    .replace(
      /(^|[\s,(])(ул|д|корп)\. (?=\p{L}|\d)/giu,
      "$1$2.\u00a0",
    )
    .replace(/([A-ZА-ЯЁ])\. (?=[A-ZА-ЯЁ]\.)/gu, "$1.\u00a0");
}

export function typographPrice(value) {
  return typographText(
    value.replace(/\d{4,}/g, (number) =>
      number.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f"),
    ),
  );
}

function closestTextContainer(node) {
  return node.parentElement?.closest(textContainerSelector) ?? null;
}

export function typographDocument(root = document.body) {
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.parentElement?.closest("script, style, svg")
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
  });

  root
    .querySelectorAll("[alt], [aria-label], [title], [placeholder]")
    .forEach((element) => {
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
