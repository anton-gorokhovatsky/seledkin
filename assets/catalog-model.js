import { typographPrice, typographText } from "./typography.js";

export function normalizeSearch(value) {
  return value.toLocaleLowerCase("ru-RU").replaceAll("ё", "е")
    .replace(/[\s\u00a0\u202f]+/gu, " ").trim();
}

export function matchesSearch(text, query) {
  const haystack = normalizeSearch(text);
  return normalizeSearch(query).split(" ").every((word) => haystack.includes(word));
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
