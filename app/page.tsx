/* eslint-disable @next/next/no-img-element */
import { ContactWidget } from "./contact-widget";
import { HarpoonIcon } from "./harpoon-icon";
import { SeaPattern } from "./sea-pattern";
import { HeroVideo } from "./hero-video";
import {
  ContactsSection,
  SiteFooter,
  SiteHeader,
  telegramOrder,
  whatsappOrder,
} from "./site-components";
import { Typographed } from "./typography";

const assortment = [
  {
    label: "Свежемороженая рыба",
    slug: "frozen-fish",
    image: "/images/fish-04.jpg",
    alt: "Рыба на разделочной доске",
  },
  {
    label: "Морепродукты",
    slug: "seafood",
    image: "/images/fish-05.jpg",
    alt: "Морские гребешки на листьях",
  },
  {
    label: "Икра",
    slug: "caviar",
    image: "/images/caviar.jpg",
    alt: "Красная икра крупным планом",
  },
  {
    label: "Слабосоленая и копченая рыба",
    slug: "prepared-fish",
    image: "/images/fish-06.jpg",
    alt: "Полки с продуктами в рыбной лавке",
  },
] as const;

const journalEntries = [
  {
    kind: "Продукт",
    date: "25 мая 2026",
    dateTime: "2026-05-25",
    title: "Филе каспийского залома",
    excerpt: "Жир, нежность, серебро бочка, аромат — всё на месте.",
    href: "https://t.me/kapitanseledkin/662",
    image: "/images/journal/caspian-zalom.jpg",
    alt: "Филе каспийского залома и кот Лосось",
  },
  {
    kind: "Рецепт",
    date: "30 мая 2026",
    dateTime: "2026-05-30",
    title: "ППП — предельно простая паста",
    excerpt:
      "Дальше — слушаете тишину. Ваши гости едят молча, не слышно даже стука приборов.",
    href: "https://t.me/kapitanseledkin/664",
    image: "/images/journal/anchovy-pasta.jpg",
    alt: "Банки с анчоусами для пасты",
  },
  {
    kind: "Из жизни лавки",
    date: "30 июля 2026",
    dateTime: "2026-07-30",
    title: "И пусть никто не уйдет обиженным!",
    excerpt:
      "Предложим готовое. Или научим готовить быстро и вкусно. Или поучимся сами, если поделитесь своими рецептами.",
    href: "https://t.me/kapitanseledkin/678",
    image: "/images/journal/open-table.jpg",
    alt: "Рыба и готовые блюда рыбной лавки",
  },
] as const;

function SunGlint() {
  return (
    <svg
      className="sun-glint"
      viewBox="0 0 240 92"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id="sun-glint-gold"
          x1="82"
          y1="46"
          x2="225"
          y2="46"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#8d5a1f" />
          <stop offset="0.31" stopColor="#d6a33f" />
          <stop offset="0.5" stopColor="#fff1a8" />
          <stop offset="0.67" stopColor="#d0942f" />
          <stop offset="1" stopColor="#99601d" />
        </linearGradient>
      </defs>
      <circle
        className="sun-glint__sun"
        cx="190"
        cy="18"
        r="15"
        fill="url(#sun-glint-gold)"
      />
      <path
        className="sun-glint__water"
        d="M142 49h83M104 61h81M154 73h68M82 84h55"
        stroke="url(#sun-glint-gold)"
      />
    </svg>
  );
}

export default function Home() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const asset = (path: string) => `${basePath}${path}`;
  const catalogHref = `${basePath}/catalog/`;
  const heroVideo = asset("/video/hero-sea-sora-draft-01.web.mp4");
  const heroPoster = asset("/video/hero-sea-sora-draft-01.webp");
  const siteUrl = basePath
    ? `https://anton-gorokhovatsky.github.io${basePath}`
    : "https://ks.fish";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: "Рыбная лавка капитана Селедкина",
    url: `${siteUrl}/`,
    telephone: "+79166751452",
    image: `${siteUrl}/video/hero-sea-sora-draft-01.webp`,
    address: {
      "@type": "PostalAddress",
      streetAddress: "ул. Строителей, д. 7, корп. 1",
      addressLocality: "Москва",
      addressCountry: "RU",
    },
    openingHours: "Mo-Su 11:00-20:00",
  };

  return (
    <Typographed>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <a className="skip-link" href="#content">
        Перейти к содержанию
      </a>

      <SiteHeader basePath={basePath} page="home" />

      <main id="content">
        <section className="hero" id="top" aria-labelledby="hero-title">
          <HeroVideo src={heroVideo} poster={heroPoster} />
          <div className="hero__shade" />

          <div className="hero__content">
            <p className="hero__kicker">Рыба и морепродукты · Москва</p>
            <h1 id="hero-title">
              <span className="hero__title-main">Рыбная лавка</span>
              {" "}
              <span className="hero__title-captain">капитана Селедкина</span>
            </h1>
            <p className="hero__lead">
              Качественная рыба на каждый день, морепродукты и деликатесы —
              выбираем сами и рассказываем, как приготовить.
            </p>
            <div className="hero__actions">
              <a className="hero-button hero-button--primary" href={telegramOrder}>
                Заказать в телеграме
              </a>
              <a className="hero-button hero-button--secondary" href={catalogHref}>
                Смотреть цены
              </a>
            </div>
          </div>

          <div className="hero__status">
            <span>Сегодня</span>
            <strong>11:00—20:00</strong>
          </div>

          <a
            className="hero__scroll"
            href="#chto-prodaem"
            aria-label="Листать к товарам"
          >
            <HarpoonIcon direction="south" />
          </a>
        </section>

        <section
          className="assortment-story wave-backed"
          id="chto-prodaem"
          aria-labelledby="assortment-title"
        >
          <SeaPattern id="assortment" />
          <div className="story-shell assortment-story__intro">
            <div className="assortment-story__copy">
              <p className="section-kicker">Что продаем</p>
              <h2 id="assortment-title">
                Еще одно место в Москве, где продается хорошая рыба
              </h2>
              <p>
                «Рыбная лавка капитана Селедкина» — небольшой магазин в
                нескольких минутах ходьбы от метро «Вавиловская».
              </p>
              <p>
                Казалось бы, обычная торговая точка, но нас уже знают не только
                жители окрестных домов — к нам приезжают из других районов
                Москвы, а потом благодарят у себя в блогах.
              </p>
              <a className="story-link" href={catalogHref}>
                Открыть каталог и цены
                <HarpoonIcon />
              </a>
            </div>

            <figure className="assortment-story__hero-image">
              <img
                src={asset("/images/fish-02.jpg")}
                alt="Камбала и нож для разделки рыбы"
              />
              <figcaption>Рыба, которую выбирают для себя</figcaption>
            </figure>
          </div>

          <nav className="story-shell assortment-grid" aria-label="Разделы каталога">
            {assortment.map((category, index) => (
              <a
                className="assortment-card"
                href={`${catalogHref}#category-${category.slug}`}
                key={category.slug}
              >
                <img src={asset(category.image)} alt={category.alt} />
                <span className="assortment-card__number" aria-hidden="true">
                  0{index + 1}
                </span>
                <span className="assortment-card__label">{category.label}</span>
                <span className="assortment-card__arrow" aria-hidden="true">
                  <HarpoonIcon />
                </span>
              </a>
            ))}
          </nav>

          <aside className="story-shell caviar-note" aria-labelledby="caviar-title">
            <img
              src={asset("/images/fish-01.jpg")}
              alt="Красная икра в стеклянной вазочке"
            />
            <div className="caviar-note__copy">
              <p className="section-kicker">Икра</p>
              <h2 id="caviar-title">Красная икра премиум-качества</h2>
              <p>
                Мы получаем икру с завода в куботейнерах и сами фасуем её в
                пластиковые контейнеры по 250 граммов и 500 граммов. Если вам
                нужен какой-то другой объем, просто дайте нам знать.
              </p>
              <p>
                Кроме рыбы, мы продаем черную, красную, икру сига, щуки и
                морского ежа. Только заводская икра, замороженная без
                консерванта, или с «человеческим» консервантом — сорбатом калия.
              </p>
              <p className="caviar-note__price">
                Цена: 3500 ₽ за 250 граммов.
              </p>
              <p>
                Заказы принимаются в{" "}
                <a className="whatsapp-link" href={whatsappOrder}>
                  WhatsApp
                </a>{" "}
                и{" "}
                <a className="telegram-link" href={telegramOrder}>
                  телеграме
                </a>
                .
              </p>
            </div>
          </aside>
        </section>

        <section
          className="principles-story wave-backed"
          id="o-nas"
          aria-labelledby="principles-title"
        >
          <SeaPattern id="principles" />
          <header className="story-shell principles-story__header">
            <p className="section-kicker">О лавке</p>
            <h2 id="principles-title">Почему о нас говорят?</h2>
            <SunGlint />
          </header>

          <article className="story-shell principle-story">
            <span className="principle-story__number" aria-hidden="true">
              01
            </span>
            <h3>Во-первых, это качество.</h3>
            <p className="principle-story__body">
              Мы изучаем предложения поставщиков и выбираем только рыбу
              свежего завоза и не вымороженную. Мы закупаем рыбу, быстро
              замороженную после поимки прямо на промысле, и ни разу с тех пор
              не размораживавшуюся: покупатель разморозит её сам уже дома. В
              лавке её быстро разбирают, а склада у нас нет, весь наш товар
              лежит в прилавках-холодильниках. Поэтому рыба не залеживается, мы
              постоянно подвозим свежемороженую продукцию.
            </p>
            <div className="principle-story__images">
              <img
                src={asset("/images/fish-08.jpg")}
                alt="Филе судовой заморозки"
              />
              <img
                src={asset("/images/fish-10.jpg")}
                alt="Форель на упаковочной бумаге"
              />
            </div>
          </article>

          <article className="story-shell principle-story principle-story--reverse">
            <span className="principle-story__number" aria-hidden="true">
              02
            </span>
            <h3>Во-вторых, ассортимент.</h3>
            <p className="principle-story__body">
              Хоть магазин и невелик, мы предлагаем и достаточно обычную рыбу
              для повседневного приготовления, и интересные деликатесы. При
              этом настоящим деликатесом могут стать и самые простые, казалось
              бы, виды — например, купленная у нас мороженая сельдь, если
              посолить её грамотно и правильно.
            </p>
            <div className="principle-story__images">
              <img
                src={asset("/images/fish-07.jpg")}
                alt="Соусы и приправы на полках"
              />
              <img src={asset("/images/fish-11.jpg")} alt="Тунец в кунжуте" />
            </div>
          </article>

          <article className="story-shell principle-story">
            <span className="principle-story__number" aria-hidden="true">
              03
            </span>
            <h3>
              И это наша третья фирменная фишка — от слова «fish», разумеется.
            </h3>
            <p className="principle-story__body">
              Наши продавцы и консультанты всегда делятся советами — или
              подскажут, где их прочитать.
            </p>
            <div className="principle-story__images">
              <img
                src={asset("/images/fish-12.jpg")}
                alt="Разделка филе тунца"
              />
              <img
                src={asset("/images/fish-09.jpg")}
                alt="Скумбрия и специи"
              />
            </div>
          </article>
        </section>

        <section className="source-statement" aria-label="Принцип лавки">
          <img
            src={asset("/images/statement-bg.jpg")}
            alt="Стейк лосося на сковороде"
          />
          <p>
            Мы убеждены, что вкус блюда определяется
            <br />не только навыками повара, но и качеством
            <br />ингредиентов
          </p>
        </section>

        <section className="founder-story wave-backed" aria-labelledby="founder-title">
          <SeaPattern id="founder" />
          <div className="story-shell founder-story__inner">
            <div className="founder-story__opening">
              <figure className="founder-story__portrait">
                <img src={asset("/images/oleg.jpg")} alt="Олег Гугунава с рыбой" />
                <figcaption>Олег Гугунава, владелец лавки</figcaption>
              </figure>
              <div className="founder-story__copy">
                <p className="section-kicker">Капитан</p>
                <h2 id="founder-title">Олег Гугунава</h2>
                <p className="founder-role">
                  Владелец «Рыбной лавки капитана Селедкина»
                </p>
                <blockquote>
                  <p className="founder-story__lead">
                    «Когда моя жена была беременна, врач посоветовал есть больше
                    рыбы и морепродуктов. Я прошелся по местным лавочкам и
                    магазинам и ужаснулся. В Москве нормальную рыбу сложно найти.
                  </p>
                </blockquote>
              </div>
            </div>
            <blockquote className="founder-story__columns">
              <p>
                Некоторые мороженную рыбу заливают водой — для веса, у других с
                весом все «ок», но неправильно везут, либо неправильно
                замораживают — если продукт и не испорчен, то точно не первого
                качества. Свою семью я этим кормить не хотел.
              </p>
              <p>
                Я позвонил знакомому во Владивосток, спросил можно ли доставить
                нормальной рыбы. Оказалось, что можно, но относительно большими
                партиями — нам столько не съесть. Походил по знакомым и соседям
                — оказалось, что спрос есть, поэтому решили скинуться и взять
                на всех. Через какое-то время открыл «лавку Капитана
                Селедкина».
              </p>
              <p>
                У нас весь бизнес основан на качестве товара и на нормах работы
                с продуктом. Забудешь, например заморозку включить — рыба
                испортится, неправильно примешь от поставщика — старая рыба
                будет лежать месяца и портится. Мы следим за такими вещами,
                поэтому можем гарантировать хорошую рыбу и морепродукты.
              </p>
            </blockquote>
          </div>
        </section>

        <section
          className="ship-log wave-backed"
          id="sudovoy-zhurnal"
          aria-labelledby="ship-log-title"
        >
          <SeaPattern id="ship-log" />
          <header className="story-shell ship-log__header">
            <div>
              <p className="section-kicker">Из телеграм-канала Олега</p>
              <h2 id="ship-log-title">Судовой журнал</h2>
            </div>
            <p>
              Избранные записи о рыбе, еде и жизни маленькой лавки у метро
              «Вавиловская».
            </p>
          </header>

          <div className="story-shell ship-log__grid">
            {journalEntries.map((entry) => (
              <article className="ship-log-card" key={entry.href}>
                <a
                  className="ship-log-card__image"
                  href={entry.href}
                  aria-label={`Читать запись «${entry.title}»`}
                >
                  <img src={asset(entry.image)} alt={entry.alt} loading="lazy" />
                </a>
                <div className="ship-log-card__meta">
                  <span>{entry.kind}</span>
                  <time dateTime={entry.dateTime}>{entry.date}</time>
                </div>
                <h3>
                  <a href={entry.href}>{entry.title}</a>
                </h3>
                <p>{entry.excerpt}</p>
                <a className="story-link" href={entry.href}>
                  Читать запись
                  <HarpoonIcon />
                </a>
              </article>
            ))}
          </div>

          <a className="ship-log__all" href="https://t.me/kapitanseledkin">
            Читать весь судовой журнал в телеграме
            <HarpoonIcon />
          </a>
        </section>

        <section
          className="purchase-story wave-backed"
          id="zakaz-i-dostavka"
          aria-labelledby="purchase-title"
        >
          <SeaPattern id="purchase" tone="blue" />
          <div className="story-shell purchase-story__header">
            <p className="section-kicker">Как купить</p>
            <h2 id="purchase-title">Выбрать, заказать, получить</h2>
          </div>

          <div className="story-shell purchase-story__layout">
            <figure className="purchase-story__image">
              <img
                src={asset("/images/contact.jpg")}
                alt="Корзина с рыбой и продуктами для доставки"
              />
              <figcaption>Магазин и доставка по Москве</figcaption>
            </figure>

            <ol className="purchase-steps">
              <li>
                <span aria-hidden="true">01</span>
                <div>
                  <h3>Выбрать</h3>
                  <p>
                    В каталоге — весь ассортимент и действующие цены.
                  </p>
                  <a className="story-link" href={catalogHref}>
                    Открыть каталог
                    <HarpoonIcon />
                  </a>
                </div>
              </li>
              <li>
                <span aria-hidden="true">02</span>
                <div>
                  <h3>Заказать</h3>
                  <p>
                    Заказы принимаются в{" "}
                    <a className="whatsapp-link" href={whatsappOrder}>
                      WhatsApp
                    </a>{" "}
                    и{" "}
                    <a className="telegram-link" href={telegramOrder}>
                      телеграме
                    </a>
                    .
                  </p>
                  <div className="purchase-steps__actions">
                    <a className="order-pill order-pill--telegram" href={telegramOrder}>
                      Заказать в телеграме
                    </a>
                    <a className="order-pill order-pill--whatsapp" href={whatsappOrder}>
                      Заказать в WhatsApp
                    </a>
                  </div>
                </div>
              </li>
              <li>
                <span aria-hidden="true">03</span>
                <div>
                  <h3>Получить</h3>
                  <p>
                    Мы доставляем нашу продукцию домой или в офис в течение двух
                    часов.
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

        <ContactsSection />
      </main>

      <SiteFooter basePath={basePath} />
      <ContactWidget />
    </Typographed>
  );
}
