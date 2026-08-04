/* The baseline deliberately keeps the original Tilda composition and assets. */
/* eslint-disable @next/next/no-img-element */
import { Catalog } from "./catalog";
import { ContactWidget } from "./contact-widget";
import { HeroVideo } from "./hero-video";
import { MobileNav } from "./mobile-nav";
import { PriceNotice } from "./price-notice";
import { Typographed } from "./typography";

const phoneLabel = "+7 916 675-14-52";
const phoneHref = "tel:+79166751452";
const telegramOrder = "https://t.me/+79166751452";
const whatsappOrder = "https://wa.me/79166751452";

const socialLinks = [
  {
    label: "Telegram",
    href: "https://t.me/kapitanseledkin",
    mark: "➤",
    icon: null,
  },
  {
    label: "X (Twitter)",
    href: "https://twitter.com/kapitanseledkin",
    mark: "𝕏",
    icon: null,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/channel/UCPc0ClmcBq3GXT2FAmMQy7A/videos",
    mark: "▶",
    icon: null,
  },
  {
    label: "SoundCloud",
    href: "https://soundcloud.com/kapitanseledkin",
    mark: null,
    icon: "soundcloud",
  },
] as const;

function SoundCloudIcon() {
  return (
    <svg
      className="social-icon social-icon--soundcloud"
      aria-hidden="true"
      viewBox="0 0 100 100"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M50 100c27.614 0 50-22.386 50-50S77.614 0 50 0 0 22.386 0 50s22.386 50 50 50Zm19.701-52.297c-1.137 0-2.222.23-3.212.644C65.83 40.867 59.555 35 51.906 35c-1.873 0-3.7.366-5.312.99-.627.242-.792.492-.799.976V63.31a.976.976 0 0 0 .897.952h23.009c4.586 0 8.3-3.673 8.3-8.259a8.3 8.3 0 0 0-8.3-8.3Zm-27-10.759a.927.927 0 0 1 .915.91l.403 18.699-.404 6.787a.924.924 0 0 1-.915.905.92.92 0 0 1-.912-.904l-.376-6.787.373-18.605.003-.095a.917.917 0 0 1 .914-.91Zm-7.13 4.26a.69.69 0 0 0-.684-.68c-.374 0-.675.3-.683.68l-.428 15.345.428 7.044a.684.684 0 0 0 .683.676.69.69 0 0 0 .683-.68l.48-7.04-.48-15.344Zm-5.09 1.679a.579.579 0 0 1 .57-.565.58.58 0 0 1 .567.565l.56 13.702-.56 7.16a.58.58 0 0 1-.567.561.578.578 0 0 1-.57-.561l-.492-7.16.493-13.702Zm-6.49 5.881a.404.404 0 0 0-.395.39L23 56.54l.596 7.148a.403.403 0 0 0 .394.388c.21 0 .38-.168.397-.389l.676-7.147-.676-7.39a.406.406 0 0 0-.397-.387Zm3.846.92a.458.458 0 0 0-.452-.442.458.458 0 0 0-.453.449l-.562 6.85.562 7.207a.46.46 0 0 0 .453.449c.24 0 .436-.194.451-.449l.64-7.206-.64-6.857Zm10.93-8.335a.802.802 0 0 0-.8.797l-.355 14.405.358 6.932a.798.798 0 0 0 1.596-.005l.401-6.925-.401-14.408a.8.8 0 0 0-.8-.796Z"
      />
    </svg>
  );
}

function SocialLinks({ light = false }: { light?: boolean }) {
  return (
    <nav
      className={`social-links${light ? " social-links--light" : ""}`}
      aria-label="Социальные сети"
    >
      {socialLinks.map((link) => (
        <a
          className={link.icon ? "social-link--icon" : undefined}
          href={link.href}
          key={link.label}
          aria-label={link.label}
        >
          {link.icon === "soundcloud" ? (
            <SoundCloudIcon />
          ) : (
            <span aria-hidden="true">{link.mark}</span>
          )}
        </a>
      ))}
    </nav>
  );
}

export default function Home() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const asset = (path: string) => `${basePath}${path}`;
  const siteUrl = basePath
    ? `https://anton-gorokhovatsky.github.io${basePath}`
    : "https://ks.fish";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: "Рыбная лавка капитана Селедкина",
    url: `${siteUrl}/`,
    telephone: "+79166751452",
    image: `${siteUrl}/images/hero-ocean.jpg`,
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

      <header className="desktop-header">
        <div className="desktop-header__top">
          <div className="header-address">
            <p>
              Адрес магазина: ул. Строителей, д. 7, корп. 1 (метро
              «Вавиловская», метро «Университет»)
            </p>
            <SocialLinks />
          </div>

          <a className="header-logo" href="#top" aria-label="На главную">
            <img
              src={asset("/images/logo.png")}
              alt="Рыбная лавка капитана Селедкина"
            />
          </a>

          <div className="header-order">
            <p>
              Качественная рыба на каждый день, морепродукты и рыбные
              деликатесы в Москве!
            </p>
            <a className="order-pill order-pill--telegram" href={telegramOrder}>
              Заказать в Telegram
            </a>
          </div>
        </div>

        <nav className="desktop-header__nav" aria-label="Основная навигация">
          <a href="#chto-prodaem">Что продаем</a>
          <a href="#o-nas">О нас</a>
          <a href="#catalog">Продукты и цены <span aria-hidden="true">⌄</span></a>
          <a href="#novosti">Новости</a>
          <a href="#zakaz-i-dostavka">Доставка</a>
          <a href="#kontakty">Контакты</a>
        </nav>
      </header>

      <MobileNav />

      <main id="content">
        <section className="tilda-hero" id="top" aria-labelledby="hero-title">
          <img
            className="tilda-hero__image"
            src={asset("/images/hero-ocean.jpg")}
            alt="Темное море с волнами"
          />
          <HeroVideo />
          <div className="tilda-hero__shade" />

          <div className="tilda-hero__desktop-copy">
            <h1 id="hero-title">«Рыбная лавка капитана Селедкина»</h1>
            <p>
              Качественная рыба на каждый день, морепродукты
              <br />и рыбные деликатесы в Москве
            </p>
          </div>

          <div className="tilda-hero__mobile-copy">
            <img
              src={asset("/images/logo.png")}
              alt="Рыбная лавка капитана Селедкина"
            />
            <p>
              Качественная рыба на каждый день,
              <br />морепродукты и рыбные деликатесы
            </p>
          </div>

          <a className="down-link" href="#chto-prodaem" aria-label="Листать к товарам">
            <span aria-hidden="true" />
          </a>
        </section>

        <section className="caviar-promo" id="chto-prodaem" aria-labelledby="caviar-title">
          <div className="source-shell promo-pair" aria-hidden="true">
            <img src={asset("/images/caviar.jpg")} alt="" />
            <img src={asset("/images/salmon-table.jpg")} alt="" />
          </div>

          <div className="source-shell caviar-promo__content">
            <div>
              <h2 id="caviar-title">Красная икра премиум-качества</h2>
              <p>
                Мы получаем икру с завода в куботейнерах и сами фасуем её в
                пластиковые контейнеры по 250 граммов и 500 граммов. Если вам
                нужен какой-то другой объем, просто дайте нам знать.
              </p>
              <p>Цена: 3500 ₽ за 250 граммов.</p>
              <p>
                Заказы принимаются в <a className="whatsapp-link" href={whatsappOrder}>WhatsApp</a>{" "}
                и <a className="telegram-link" href={telegramOrder}>Telegram</a>.
              </p>
            </div>
            <img
              src={asset("/images/fish-01.jpg")}
              alt="Красная икра в стеклянной вазочке"
            />
          </div>
        </section>

        <div className="fish-school fish-school--after-caviar" aria-hidden="true">
          <img src={asset("/images/frame-27.png")} alt="" />
        </div>

        <figure className="panorama" aria-label="Рыба и продукты лавки">
          <img src={asset("/images/photo.png")} alt="Рыба и продукты лавки на столе" />
        </figure>

        <section className="about-source" id="o-nas" aria-labelledby="about-title">
          <div className="source-shell about-row">
            <img
              src={asset("/images/fish-02.jpg")}
              alt="Камбала и нож для разделки рыбы"
            />
            <div className="about-row__copy">
              <h2 id="about-title">
                Еще одно место в Москве, где продается хорошая рыба
              </h2>
              <p>
                «Рыбная лавка капитана Селедкина» — небольшой магазин в
                нескольких минутах ходьбы от метро «Университет».
              </p>
              <p>
                Казалось бы, обычная торговая точка, но нас уже знают не только
                жители окрестных домов — к нам приезжают из других районов
                Москвы, а потом благодарят у себя в блогах.
              </p>
            </div>
          </div>

          <div className="source-shell about-row about-row--reverse">
            <div className="about-row__copy">
              <h2>Икра</h2>
              <p>
                Кроме рыбы, мы продаем черную, красную, икру сига, щуки и
                морского ежа. Только заводская икра, замороженная без
                консерванта, или с «человеческим» консервантом — сорбатом калия.
              </p>
            </div>
            <img
              src={asset("/images/fish-03.jpg")}
              alt="Икра внутри свежей рыбы"
            />
          </div>
        </section>

        <section className="principles-source" aria-labelledby="principles-title">
          <div className="source-shell principles-source__grid">
            <div className="principles-collage" aria-label="Фотографии рыбы и лавки">
              <img src={asset("/images/fish-04.jpg")} alt="Рыба на разделочной доске" />
              <img src={asset("/images/fish-05.jpg")} alt="Морские гребешки на листьях" />
              <img src={asset("/images/fish-06.jpg")} alt="Полки с продуктами в лавке" />
            </div>

            <div className="principles-source__copy">
              <h2 id="principles-title">Почему о нас говорят?</h2>
              <p>
                <strong>Во-первых, это качество.</strong> Мы изучаем предложения
                поставщиков и выбираем только рыбу свежего завоза и не
                вымороженную. Мы закупаем рыбу, быстро замороженную после поимки
                прямо на промысле, и ни разу с тех пор не размораживавшуюся:
                покупатель разморозит её сам уже дома. В лавке её быстро
                разбирают, а склада у нас нет, весь наш товар лежит в
                прилавках-холодильниках. Поэтому рыба не залеживается, мы
                постоянно подвозим свежемороженую продукцию.
              </p>
              <p>
                <strong>Во-вторых, ассортимент.</strong> Хоть магазин и невелик,
                мы предлагаем и достаточно обычную рыбу для повседневного
                приготовления, и интересные деликатесы. При этом настоящим
                деликатесом могут стать и самые простые, казалось бы, виды —
                например, купленная у нас мороженая сельдь, если посолить её
                грамотно и правильно.
              </p>
              <p>
                И это наша <strong>третья фирменная фишка</strong> — от слова
                «fish», разумеется. Наши продавцы и консультанты всегда делятся
                советами — или подскажут, где их прочитать.
              </p>
            </div>
          </div>
        </section>

        <section className="source-gallery" aria-label="Фотографии рыбной лавки">
          <div className="source-gallery__grid">
            <img src={asset("/images/fish-07.jpg")} alt="Соусы и приправы на полках" />
            <img src={asset("/images/fish-08.jpg")} alt="Филе судовой заморозки" />
            <img src={asset("/images/fish-09.jpg")} alt="Скумбрия и специи" />
            <img src={asset("/images/fish-10.jpg")} alt="Форель на упаковочной бумаге" />
            <img src={asset("/images/fish-11.jpg")} alt="Тунец в кунжуте" />
            <img src={asset("/images/fish-12.jpg")} alt="Разделка филе тунца" />
          </div>
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

        <section className="founder-source" aria-labelledby="founder-title">
          <img src={asset("/images/oleg.jpg")} alt="Олег Гугунава с рыбой" />
          <div className="founder-source__copy">
            <h2 id="founder-title">Олег Гугунава</h2>
            <p className="founder-role">Владелец «Рыбной лавки капитана Селедкина»</p>
            <blockquote>
              <p>
                «Когда моя жена была беременна, врач посоветовал есть больше
                рыбы и морепродуктов. Я прошелся по местным лавочкам и магазинам
                и ужаснулся. В Москве нормальную рыбу сложно найти.
              </p>
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
                — оказалось, что спрос есть, поэтому решили скинуться и взять на
                всех. Через какое-то время открыл «лавку Капитана Селедкина».
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

        <section className="news-source" id="novosti" aria-labelledby="news-title">
          <h2 id="news-title">Наши новости</h2>
          <div className="source-shell news-placeholder" role="status">
            <span className="visually-hidden">Лента новостей временно недоступна.</span>
            <span lang="en" aria-hidden="true">Feed not found.</span>
          </div>
          <div className="fish-school fish-school--news" aria-hidden="true">
            <img src={asset("/images/frame-27.png")} alt="" />
          </div>
        </section>

        <Catalog />

        <div className="catalog-tail" aria-hidden="true">
          <img src={asset("/images/frame-27.png")} alt="" />
        </div>

        <figure className="panorama panorama--before-delivery" aria-label="Ассортимент лавки">
          <img src={asset("/images/photo.png")} alt="Ассортимент рыбной лавки" />
        </figure>

        <section className="delivery-source" id="zakaz-i-dostavka" aria-labelledby="delivery-title">
          <div className="source-shell delivery-source__grid">
            <img
              src={asset("/images/contact.jpg")}
              alt="Корзина с рыбой и продуктами для доставки"
            />
            <div>
              <h2 id="delivery-title">Доставка</h2>
              <p>Мы доставляем нашу продукцию домой или в офис в течение двух часов.</p>
              <p>
                Стоимость доставки в пределах МКАД — 490 ₽. Минимальной суммы
                заказа нет, это удобно.
              </p>
              <p>
                Заказы принимаются в <a className="whatsapp-link" href={whatsappOrder}>WhatsApp</a>{" "}
                и <a className="telegram-link" href={telegramOrder}>Telegram</a>.
              </p>
            </div>
          </div>
        </section>

        <section className="contacts-source" id="kontakty" aria-labelledby="contacts-title">
          <iframe
            className="contacts-source__map"
            title="Карта проезда к магазину на улице Строителей"
            src="https://yandex.ru/map-widget/v1/?text=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0%2C%20%D1%83%D0%BB%D0%B8%D1%86%D0%B0%20%D0%A1%D1%82%D1%80%D0%BE%D0%B8%D1%82%D0%B5%D0%BB%D0%B5%D0%B9%2C%207%D0%BA1&z=15"
            loading="lazy"
          />
          <div className="contacts-source__card">
            <h2 id="contacts-title">Магазин на улице Строителей</h2>
            <address>
              <p><strong>Телефон:</strong> <a href={phoneHref}>{phoneLabel}</a></p>
              <p>
                <strong>Адрес лавки:</strong> Москва, ул. Строителей, д. 7,
                корп. 1. Метро «Вавиловская», метро «Университет»
              </p>
              <p><strong>Время работы:</strong><br />Ежедневно с 11:00 до 20:00</p>
            </address>
            <SocialLinks />
          </div>
        </section>
      </main>

      <footer className="source-footer">
        <img className="source-footer__cat" src={asset("/images/salmon.png")} alt="Рыжий кот" />
        <p>
          P. S.: а еще мы публикуем советы по приготовлению и обработке рыбы,
          все наши новости, в т. ч. об ассортименте, в наших социальных сетях.
          <br />Подписывайтесь!
        </p>
        <SocialLinks light />
        <div className="source-footer__rule" />
        <small>© «Рыбная лавка капитана Селедкина», 2026</small>
      </footer>

      <ContactWidget />

      <PriceNotice whatsappOrder={whatsappOrder} fishImage={asset("/images/frame-27.png")} />
    </Typographed>
  );
}
