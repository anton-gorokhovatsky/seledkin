/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { HarpoonIcon } from "../harpoon-icon";
import { catalog, type CatalogItem } from "../products";
import { SeaPattern } from "../sea-pattern";
import { ThemeToggle } from "../theme-toggle";
import {
  phoneHref,
  phoneLabel,
  telegramOrder,
  whatsappOrder,
} from "../site-components";
import { Typographed } from "../typography";
import styles from "./concept.module.css";

export const metadata: Metadata = {
  title: "Концепт — Рыбная лавка капитана Селедкина",
  description:
    "Локальный продуктовый концепт сайта Рыбной лавки капитана Селедкина.",
  robots: {
    index: false,
    follow: false,
  },
};

type FeaturedProduct = CatalogItem & {
  category: string;
  categorySlug: string;
};

const featuredProductSpecs = [
  { categorySlug: "frozen-fish", name: "Нерка" },
  { categorySlug: "seafood", name: "Гребешок" },
  { categorySlug: "caviar", name: "Красная икра" },
  { categorySlug: "prepared-fish", name: "Сельдь слабосоленая" },
] as const;

function getFeaturedProduct(
  categorySlug: string,
  productName: string,
): FeaturedProduct {
  const category = catalog.find((entry) => entry.slug === categorySlug);
  const product = category?.items.find((entry) => entry.name === productName);

  if (!category || !product) {
    throw new Error(
      `Не найдена позиция концепта: ${categorySlug} / ${productName}`,
    );
  }

  return {
    ...product,
    category: category.label,
    categorySlug: category.slug,
  };
}

const featuredProducts = featuredProductSpecs.map((entry) =>
  getFeaturedProduct(entry.categorySlug, entry.name),
);

const catalogItemCount = catalog.reduce(
  (total, category) => total + category.items.length,
  0,
);

const principles = [
  {
    number: "01",
    title: "Во-первых, это качество.",
    body:
      "Мы изучаем предложения поставщиков и выбираем только рыбу свежего завоза и не вымороженную. Мы закупаем рыбу, быстро замороженную после поимки прямо на промысле, и ни разу с тех пор не размораживавшуюся: покупатель разморозит её сам уже дома. В лавке её быстро разбирают, а склада у нас нет, весь наш товар лежит в прилавках-холодильниках. Поэтому рыба не залеживается, мы постоянно подвозим свежемороженую продукцию.",
  },
  {
    number: "02",
    title: "Во-вторых, ассортимент.",
    body:
      "Хоть магазин и невелик, мы предлагаем и достаточно обычную рыбу для повседневного приготовления, и интересные деликатесы. При этом настоящим деликатесом могут стать и самые простые, казалось бы, виды — например, купленная у нас мороженая сельдь, если посолить её грамотно и правильно.",
  },
  {
    number: "03",
    title: "И это наша третья фирменная фишка — от слова «fish», разумеется.",
    body:
      "Наши продавцы и консультанты всегда делятся советами — или подскажут, где их прочитать.",
  },
] as const;

export default function ConceptPage() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const asset = (path: string) => `${basePath}${path}`;
  const catalogHref = `${basePath}/catalog/`;
  const mapHref =
    "https://yandex.ru/maps/?text=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0%2C%20%D1%83%D0%BB%D0%B8%D1%86%D0%B0%20%D0%A1%D1%82%D1%80%D0%BE%D0%B8%D1%82%D0%B5%D0%BB%D0%B5%D0%B9%2C%207%2C%20%D0%BA%D0%BE%D1%80%D0%BF%D1%83%D1%81%201";

  return (
    <Typographed>
      <div className={styles.site}>
        <a className={styles.skipLink} href="#concept-content">
          Перейти к содержанию
        </a>

        <header className={styles.header}>
          <div className={styles.headerMeta}>
            <p>Москва · м. «Вавиловская» · 300 м от метро</p>
            <p>Ежедневно, 11:00—20:00</p>
          </div>
          <div className={styles.headerMain}>
            <a className={styles.brand} href="#top" aria-label="В начало">
              <img
                src={asset("/images/logo-redrawn.svg")}
                alt="Рыбная лавка капитана Селедкина"
              />
            </a>
            <nav className={styles.navigation} aria-label="Основная навигация">
              <a href="#assortment">Каталог</a>
              <a href="#about">О лавке</a>
              <a href="#journal">Судовой журнал</a>
              <a href="#contacts">Контакты</a>
            </nav>
            <div className={styles.headerActions}>
              <ThemeToggle className={styles.themeToggle} />
              <a className={styles.headerOrder} href={telegramOrder}>
                Заказать
                <HarpoonIcon />
              </a>
            </div>
          </div>
        </header>

        <main id="concept-content">
          <section className={styles.hero} id="top" aria-labelledby="concept-title">
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Рыба и морепродукты · Москва</p>
              <h1 id="concept-title">
                <span>Рыбная лавка</span>
                <em>капитана Селедкина</em>
              </h1>
              <p className={styles.heroLead}>
                Качественная рыба на каждый день, морепродукты и деликатесы —
                выбираем сами и рассказываем, как приготовить.
              </p>
              <div className={styles.heroActions}>
                <a className={styles.primaryAction} href={catalogHref}>
                  Каталог и цены
                  <HarpoonIcon />
                </a>
                <a className={styles.secondaryAction} href={telegramOrder}>
                  Заказать в Телеграме
                </a>
              </div>
              <dl className={styles.heroFacts}>
                <div>
                  <dt>Сегодня</dt>
                  <dd>11:00—20:00</dd>
                </div>
                <div>
                  <dt>Лавка</dt>
                  <dd>ул. Строителей, 7, корп. 1</dd>
                </div>
              </dl>
            </div>

            <figure className={styles.heroFigure}>
              <div className={styles.heroPhoto}>
                <img
                  src={asset("/images/fish-02.jpg")}
                  alt="Камбала и нож для разделки рыбы"
                />
              </div>
              <figcaption>
                <span>Рыба, которую выбирают для себя</span>
                <span aria-hidden="true">01</span>
              </figcaption>
            </figure>
          </section>

          <section
            className={styles.assortment}
            id="assortment"
            aria-labelledby="assortment-title"
          >
            <div className={styles.shell}>
              <header className={styles.sectionHeader}>
                <p className={styles.eyebrow}>Из каталога</p>
                <h2 id="assortment-title">
                  В каталоге — весь ассортимент и действующие цены.
                </h2>
                <p>
                  Полный прайс живет на отдельной странице. Наличие конкретной
                  позиции можно уточнить у лавки.
                </p>
              </header>

              <div className={styles.counterGrid}>
                <figure className={styles.counterPhoto}>
                  <img
                    src={asset("/images/fish-04.jpg")}
                    alt="Рыба на разделочной доске со специями"
                    loading="lazy"
                  />
                  <figcaption>Качественная рыба на каждый день</figcaption>
                </figure>

                <div className={styles.priceBoard}>
                  {featuredProducts.map((product, index) => (
                    <a
                      className={styles.productRow}
                      href={`${catalogHref}#category-${product.categorySlug}`}
                      key={`${product.categorySlug}-${product.name}`}
                    >
                      <span className={styles.productNumber} aria-hidden="true">
                        0{index + 1}
                      </span>
                      <span className={styles.productCopy}>
                        <span className={styles.productCategory}>{product.category}</span>
                        <strong>{product.name}</strong>
                        {product.description ? <small>{product.description}</small> : null}
                      </span>
                      <span className={styles.productPrice}>{product.price}</span>
                      <HarpoonIcon />
                    </a>
                  ))}

                  <a className={styles.catalogAction} href={catalogHref}>
                    Смотреть все {catalogItemCount} позиций
                    <HarpoonIcon />
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.about} id="about" aria-labelledby="about-title">
            <div className={styles.shell}>
              <div className={styles.aboutOpening}>
                <figure className={styles.olegPortrait}>
                  <img
                    src={asset("/images/oleg.jpg")}
                    alt="Олег Гугунава с рыбой"
                    loading="lazy"
                  />
                  <figcaption>Олег Гугунава, владелец лавки</figcaption>
                </figure>
                <div className={styles.aboutCopy}>
                  <p className={styles.eyebrow}>Капитан</p>
                  <h2 id="about-title">Олег Гугунава</h2>
                  <p className={styles.founderRole}>
                    Владелец «Рыбной лавки капитана Селедкина»
                  </p>
                  <blockquote>
                    «Когда моя жена была беременна, врач посоветовал есть больше
                    рыбы и морепродуктов. Я прошелся по местным лавочкам и
                    магазинам и ужаснулся. В Москве нормальную рыбу сложно найти.
                  </blockquote>
                </div>
              </div>

              <div className={styles.principles}>
                <div className={styles.principlesIntro}>
                  <p className={styles.eyebrow}>О лавке</p>
                  <h3>Почему о нас говорят?</h3>
                </div>
                <div className={styles.principleList}>
                  {principles.map((principle) => (
                    <details key={principle.number}>
                      <summary>
                        <span aria-hidden="true">{principle.number}</span>
                        <strong>{principle.title}</strong>
                      </summary>
                      <p>{principle.body}</p>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className={styles.order} id="order" aria-labelledby="order-title">
            <div className={styles.orderPoster}>
              <SeaPattern id="concept-order" tone="blue" variant="purchase" />
              <div className={styles.orderPosterCopy}>
                <p className={styles.orderEyebrow}>Как купить</p>
                <h2 id="order-title">Выбрать, заказать, получить</h2>
              </div>
            </div>

            <div className={`${styles.shell} ${styles.orderGrid}`}>
              <figure className={styles.orderPhoto}>
                <img
                  src={asset("/images/contact.jpg")}
                  alt="Корзина с рыбой и продуктами для доставки"
                  loading="lazy"
                />
                <figcaption>Магазин и доставка по Москве</figcaption>
              </figure>

              <ol className={styles.orderSteps}>
                <li>
                  <span aria-hidden="true">01</span>
                  <div>
                    <h3>Выбрать</h3>
                    <p>В каталоге — весь ассортимент и действующие цены.</p>
                    <a href={catalogHref}>Открыть каталог</a>
                  </div>
                </li>
                <li>
                  <span aria-hidden="true">02</span>
                  <div>
                    <h3>Заказать</h3>
                    <p>Заказы принимаются в WhatsApp и телеграме.</p>
                    <div className={styles.orderActions}>
                      <a href={telegramOrder}>Заказать в Телеграме</a>
                      <a href={whatsappOrder}>WhatsApp</a>
                    </div>
                  </div>
                </li>
                <li>
                  <span aria-hidden="true">03</span>
                  <div>
                    <h3>Получить</h3>
                    <p>
                      Мы доставляем нашу продукцию домой или в офис в течение
                      двух часов.
                    </p>
                    <p>
                      Стоимость доставки в пределах МКАД — 490 ₽. Минимальной
                      суммы заказа нет, это удобно.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </section>

          <section
            className={styles.journal}
            id="journal"
            aria-labelledby="journal-title"
          >
            <div className={`${styles.shell} ${styles.journalGrid}`}>
              <div className={styles.journalCopy}>
                <p className={styles.eyebrow}>Судовой журнал · 25 мая 2026</p>
                <h2 id="journal-title">Филе каспийского залома</h2>
                <p className={styles.journalLead}>
                  Жир, нежность, серебро бочка, аромат — всё на месте.
                </p>
                <a
                  className={styles.journalAction}
                  href="https://t.me/kapitanseledkin/662"
                >
                  Читать запись Олега
                  <HarpoonIcon />
                </a>
              </div>
              <figure className={styles.journalPhoto}>
                <img
                  src={asset("/images/journal/caspian-zalom.jpg")}
                  alt="Филе каспийского залома и кот Лосось"
                  loading="lazy"
                />
              </figure>
            </div>
          </section>
        </main>

        <footer className={styles.footer} id="contacts">
          <div className={`${styles.shell} ${styles.footerGrid}`}>
            <div className={styles.footerCopy}>
              <p className={styles.footerEyebrow}>Кот Лосось</p>
              <h2>Ничего не рекламирует, просто напоминает.</h2>
              <address>
                <p>
                  Москва, ул. Строителей, д. 7, корп. 1.
                  <br />Около 300 м от метро «Вавиловская».
                </p>
                <p>
                  Ежедневно, 11:00—20:00
                  <br />
                  <a href={phoneHref}>{phoneLabel}</a>
                </p>
              </address>
              <div className={styles.footerActions}>
                <a href={telegramOrder}>Заказать в Телеграме</a>
                <a href={mapHref}>Открыть в Яндекс Картах</a>
              </div>
              <nav className={styles.footerLinks} aria-label="Социальные сети">
                <a href="https://t.me/kapitanseledkin">Телеграм</a>
                <a href="https://www.youtube.com/channel/UCPc0ClmcBq3GXT2FAmMQy7A/videos">
                  YouTube
                </a>
                <a href="https://soundcloud.com/kapitanseledkin">SoundCloud</a>
              </nav>
            </div>

            <figure className={styles.salmonPortrait}>
              <img
                src={asset("/images/salmon-cat.jpg")}
                alt="Кот Лосось греется на солнце с закрытыми глазами"
                loading="lazy"
              />
              <figcaption>Лосось, кот рыбной лавки</figcaption>
            </figure>
          </div>
          <div className={`${styles.shell} ${styles.footerBase}`}>
            <small>© «Рыбная лавка капитана Селедкина», 2026</small>
            <a href="#top">В начало</a>
          </div>
        </footer>
      </div>
    </Typographed>
  );
}
