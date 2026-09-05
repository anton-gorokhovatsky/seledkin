import { typographPrice, typographText } from "./typography.js";

export function normalizeSearch(value) {
  return value.toLocaleLowerCase("ru-RU").replaceAll("ё", "е")
    .replace(/[\s\u00a0\u202f]+/gu, " ").trim();
}

// Equivalent words from the shop's vocabulary; distinct fish stay distinct.
const searchForms = new Map([
  ["креветка", "креветки", "креветку", "креветок", "креветкой", "креветками"],
  ["кальмар", "кальмара", "кальмары", "кальмаров", "кальмаром", "кальмарами"],
  ["сельдь", "сельди", "сельдей", "сельдью", "селедка", "селедки", "селедку", "селедок", "селедкой"],
  ["лосось", "лосося", "лососи", "лососей", "лососем"],
  ["треска", "трески", "треску", "треской"],
  ["краб", "краба", "крабы", "крабов", "крабом", "крабами"],
  ["осьминог", "осьминога", "осьминоги", "осьминогов", "осьминогом"],
  ["мидия", "мидии", "мидий", "мидиями"],
  ["гребешок", "гребешка", "гребешки", "гребешков"],
  ["стейк", "стейка", "стейки", "стейков"],
  ["северная", "северный", "северное", "северные", "северной", "северную", "северных"],
  ["тигровая", "тигровые", "тигровой", "тигровую", "тигровых"],
  ["патагонская", "патагонские", "патагонской", "патагонскую", "патагонских"],
  ["командорский", "командорского", "командорские", "командорских"],
].flatMap((forms) => forms.map((word) => [word, forms[0]])));

export function matchesSearch(text, query) {
  const haystack = normalizeSearch(text);
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return true;
  const words = new Set((haystack.match(/[\p{L}\p{N}]+/gu) ?? [])
    .map((word) => searchForms.get(word) ?? word));
  const terms = normalizedQuery.match(/[\p{L}\p{N}]+/gu) ?? [];
  return terms.length > 0 && terms.every((term) => {
    const equivalent = searchForms.get(term);
    return equivalent ? words.has(equivalent) : haystack.includes(term);
  });
}

export function positionCount(value) {
  const lastTwo = value % 100;
  const last = value % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return `${value} позиций`;
  if (last === 1) return `${value} позиция`;
  if (last >= 2 && last <= 4) return `${value} позиции`;
  return `${value} позиций`;
}

export function orderLinks(product) {
  const text = [
    "Здравствуйте! Хочу заказать:",
    typographText(product.name),
    product.description ? typographText(product.description) : null,
    typographPrice(product.price),
    "Подскажите, пожалуйста, наличие.",
  ].filter(Boolean).join("\n");
  const draft = encodeURIComponent(text);
  return {
    telegram: `https://t.me/+79166751452?text=${draft}`,
    whatsapp: `https://wa.me/79166751452?text=${draft}`,
  };
}
