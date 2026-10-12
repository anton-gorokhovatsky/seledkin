// The user approved omitting social tag rows on 12 October 2026. A mixed
// paragraph remains prose: hashtags inside it cannot excuse losing its words.
export function isSocialTagRow(html) {
  const words = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().split(/\s+/u);
  return words.length > 0 && words.every(word => /^#[\p{L}\p{N}_]*$/u.test(word));
}
