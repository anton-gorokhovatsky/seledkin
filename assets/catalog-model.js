import { typographPrice, typographText } from "./typography.js?v=typography-23-1";

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
  ["тунец", "тунца", "тунцу", "тунцом", "тунце"],
  ["щука", "щуки", "щуку", "щукой"],
  ["форель", "форели", "форелью"],
  ["угорь", "угря", "угрей", "угрем"],
  ["осетр", "осетра", "осетры", "осетров", "осетром"],
  ["горбуша", "горбуши", "горбушу", "горбушей"],
  ["кета", "кеты", "кету", "кетой"],
  ["нерка", "нерки", "нерку", "неркой"],
  ["кижуч", "кижуча", "кижучом"],
  ["скумбрия", "скумбрии", "скумбрию", "скумбрией"],
  ["омуль", "омуля", "омулем"],
  ["палтус", "палтуса", "палтусом"],
  ["окунь", "окуня", "окуней", "окунем"],
  ["сиг", "сига", "сигом"],
  ["чир", "чира", "чиром"],
  ["нельма", "нельмы", "нельму", "нельмой"],
  ["корюшка", "корюшки", "корюшку", "корюшкой"],
  ["барабуля", "барабули", "барабулю", "барабулей"],
  ["залом", "залома", "заломом"],
  ["тугунок", "тугунка", "тугунки", "тугунков", "тугунком"],
  ["риет", "риеты", "риета", "риетов", "риетами"],
  ["паштет", "паштеты", "паштета", "паштетов", "паштетом"],
  ["икра", "икры", "икру", "икрой"],
  ["печень", "печени", "печенью"],
  ["язык", "языки", "языка", "языков"],
  ["рыба", "рыбы", "рыбу", "рыбой"],
  ["голова", "головы", "голову", "голов"],
  ["слабосоленая", "слабосоленый", "слабосоленое", "слабосоленые", "слабосоленой", "слабосоленого", "слабосоленых", "слабосоленую"],
  ["малосольный", "малосольная", "малосольное", "малосольные", "малосольного", "малосольной", "малосольных", "малосольную"],
  ["копченый", "копченая", "копченое", "копченые", "копченого", "копченой", "копченых", "копченую", "копчение", "копчения"],
  ["холодный", "холодная", "холодное", "холодного", "холодной"],
  ["горячий", "горячая", "горячее", "горячего", "горячей"],
  ["свежемороженая", "свежемороженый", "свежемороженые", "свежемороженой", "свежемороженого", "свежемороженых"],
  ["вареная", "вареный", "вареные", "вареной", "вареного", "вареных", "варено"],
].flatMap((forms) => forms.map((word) => [word, forms[0]])));

// A mixed category is a navigation group, not a property of every product.
// In particular, smoked fish must not match "слабосолёная" just because of
// the shared "Слабосоленая и копченая рыба" heading.
export function productSearchText(category, product) {
  const categoryTerms = category.slug === "prepared-fish" ? "рыба" : category.label;
  return [categoryTerms, product.name, product.description].filter(Boolean).join(" ")
    .replace(/(?<!\p{L})в\/м(?!\p{L})/gu, "в/м варено мороженая")
    .replace(/(?<!\p{L})б\/г(?!\p{L})/gu, "б/г без головы");
}

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
  if (lastTwo >= 11 && lastTwo <= 14) return `${value}\u00a0позиций`;
  if (last === 1) return `${value}\u00a0позиция`;
  if (last >= 2 && last <= 4) return `${value}\u00a0позиции`;
  return `${value}\u00a0позиций`;
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
