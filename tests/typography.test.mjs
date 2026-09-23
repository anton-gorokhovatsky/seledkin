import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { typographPrice, typographText } from "../assets/typography.js";

test("Russian copy preserves nested quotes, word hyphens and authored dialogue", () => {
  assert.equal(typographText("«Всё „ок“, но неправильно везут»"), "«Всё „ок“, но\u00a0неправильно везут»");
  assert.equal(typographText("Прилавки-холодильники — в лавке."), "Прилавки-холодильники\u00a0— в\u00a0лавке.");
  assert.equal(typographText("Лосось на вахте - заходите в лавку"), "Лосось на\u00a0вахте\u00a0— заходите в\u00a0лавку");
  assert.equal(typographText("— Вы узнаете меня, принц?"), "— Вы узнаете меня, принц?");
  assert.equal(typographText("Стоимость доставки — "), "Стоимость доставки\u00a0— ");
});

test("shop dates, prices and whole unit names stay together without changing values", () => {
  assert.equal(typographText("22 сентября 2026"), "22\u00a0сентября\u00a02026");
  assert.equal(typographText("Килограмм стоит 2490 ₽. Вес 10–15 граммов."), "Килограмм стоит 2\u202f490\u00a0₽. Вес 10–15\u00a0граммов.");
  assert.equal(typographPrice("330 ₽/0,450 мл"), "330\u00a0₽/0,450\u00a0мл");
  assert.equal(typographText("Глазировка 0%. Стоит 499 рублей."), "Глазировка 0\u00a0%. Стоит 499\u00a0рублей.");
  assert.equal(typographText("2026 год, 12 глав, 3 лавки"), "2026 год, 12 глав, 3 лавки");
});

test("short conjunctions, particles and abbreviations attach to their semantic neighbor", () => {
  assert.equal(typographText("Не нужно ни подчеркивать, ни скрывать."), "Не\u00a0нужно ни\u00a0подчеркивать, ни\u00a0скрывать.");
  assert.equal(typographText("Казалось бы, но и это важно. Есть ли рыба?"), "Казалось\u00a0бы, но\u00a0и\u00a0это важно. Есть\u00a0ли рыба?");
  assert.equal(typographText("Печень трески ж. б.; креветка б/г"), "Печень трески ж.\u00a0б.; креветка б/г");
  assert.equal(typographText("в т. ч. об ассортименте"), "в\u00a0т.\u00a0ч. об\u00a0ассортименте");
  assert.equal(typographText("Запись № 694; 2 из 5; 114 позиций"), "Запись №\u00a0694; 2\u00a0из\u00a05; 114\u00a0позиций");
});

test("phone typography preserves digits and technical strings remain exact", () => {
  assert.equal(typographText("+7 916 675-14-52"), "+7\u00a0916\u00a0675‑14‑52");
  for (const value of ["https://ks.fish/catalog/?q=0%25", "https://t.me/kapitanseledkin/694", "mail@ks.fish", "journal-entry-694", "2026-09-22"]) {
    assert.equal(typographText(value), value);
  }
});

test("repeated formatting is stable for actual mixed Russian copy", () => {
  const copy = "«Всё „ок“, но и глазировка 0%. 22 сентября 2026 банка стоит 2490 ₽. Позвонить: +7 916 675-14-52. Спросить в Телеграме: https://t.me/kapitanseledkin/694»";
  const formatted = typographText(copy);
  assert.equal(typographText(formatted), formatted);
});

test("published HTML retains typography even before the page scripts run", async () => {
  for (const path of ["index.html", "catalog/index.html", "about/index.html", "journal/index.html", "404.html"]) {
    const html = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    for (const [, title] of html.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/g)) {
      // These dots abbreviate the container type, rather than end a sentence.
      if (/(?:ж|ст)\.\s*б\.$/u.test(title.trim())) continue;
      assert.doesNotMatch(title.trim(), /\.$/u, `${path}: ${title}`);
    }
    if (path === "index.html") {
      for (const [, title] of html.matchAll(/<figcaption>.*?<strong>([^<]+)<\/strong><\/figcaption>/g)) {
        assert.doesNotMatch(title, /\.$/u);
      }
    }
    assert.doesNotMatch(html, /(?<!\d)10-15(?:\s|&nbsp;)граммов/);
    for (const [, text] of html.matchAll(/<time\b[^>]*>([^<]+)<\/time>/g)) {
      assert.match(text, /\d\u00a0(?:сентября|августа)/);
    }
    if (path !== "404.html") {
      assert.match(html, /Позвонить в\u00a0лавку: \+7\u00a0916\u00a0675‑14‑52/);
    }
    if (path === "about/index.html") assert.match(html, /всё „ок“, но\u00a0неправильно/);
    if (path === "catalog/index.html") assert.match(html, /330\u00a0₽\/0,450\u00a0мл/);
  }
});
