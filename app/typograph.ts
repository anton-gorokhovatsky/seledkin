const shortRussianWord =
  /(^|[\s«„(])([А-Яа-яЁё]{1,2}) (?=[А-Яа-яЁё0-9«„])/gu;

export function typograph(text: string) {
  let result = text
    .replace(/(\d) (?=\d{3}\b)/g, "$1\u202f")
    .replace(
      /(^|[\s,(])(ул|д|корп|стр|кв|просп|пер|наб|бул|м|т|в)\. (?=[А-Яа-яЁё0-9«„])/giu,
      "$1$2.\u00a0",
    )
    .replace(
      /(\d) (?=(?:₽|кг|мл|г|л|%)(?![А-Яа-яЁё]))/gu,
      "$1\u00a0",
    )
    .replace(/ ([—–]) /g, "\u00a0$1 ");

  // Несколько проходов нужны для цепочек вроде «и в этот день».
  for (let pass = 0; pass < 3; pass += 1) {
    result = result.replace(shortRussianWord, "$1$2\u00a0");
  }

  return result;
}
