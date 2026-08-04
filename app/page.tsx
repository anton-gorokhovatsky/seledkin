/* Static export keeps the original Tilda assets as plain files. */
/* eslint-disable @next/next/no-img-element */
import { Catalog } from "./catalog";
import { MobileNav } from "./mobile-nav";
import { Typographed } from "./typography";

const phoneLabel = "+7 916 675-14-52";
const phoneHref = "tel:+79166751452";
const telegramOrder = "https://t.me/+79166751452";
const whatsappOrder = "https://wa.me/79166751452";

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

      <header className="site-header">
        <div className="header-meta">
          <p>Москва · ул. Строителей, 7, корп. 1</p>
          <a href={phoneHref}>{phoneLabel}</a>
        </div>
        <div className="header-main">
          <a className="brand" href="#top" aria-label="На главную">
            <img
              src={asset("/images/logo.png")}
              alt="Рыбная лавка капитана Селедкина"
            />
          </a>
          <nav className="desktop-nav" aria-label="Основная навигация">
            <a href="#fish">Что продаем</a>
            <a href="#about">О лавке</a>
            <a href="#catalog">Каталог</a>
            <a href="#delivery">Доставка</a>
            <a href="#contacts">Контакты</a>
          </nav>
          <a className="header-order" href={telegramOrder}>
            Заказать
            <span aria-hidden="true">↗</span>
          </a>
          <MobileNav />
        </div>
      </header>

      <main>
        <section className="hero" id="top">
          <img
            className="hero-image"
            src={asset("/images/hero-ocean.jpg")}
            alt="Темное море с волнами"
          />
          <div className="hero-shade" />
          <div className="hero-content">
            <p className="hero-kicker">Рыба и морепродукты · Москва</p>
            <h1>
              Рыбная лавка
              <span>капитана Селедкина</span>
            </h1>
            <p className="hero-lead">
              Качественная рыба на каждый день, морепродукты и деликатесы —
              выбираем сами и рассказываем, как приготовить.
            </p>
            <div className="button-row hero-actions">
              <a className="button button-primary" href={telegramOrder}>
                Заказать в Telegram
              </a>
              <a className="button button-ghost" href="#catalog">
                Смотреть цены
              </a>
            </div>
          </div>
          <div className="hero-status">
            <span>Сегодня</span>
            <strong>11:00—20:00</strong>
          </div>
          <a className="hero-scroll" href="#fish" aria-label="Листать к ассортименту">
            <span aria-hidden="true">↓</span>
          </a>
        </section>

        <div className="marquee" aria-label="Главное о лавке">
          <div>
            <span>Без повторной заморозки</span>
            <span aria-hidden="true">◆</span>
            <span>Свежий завоз</span>
            <span aria-hidden="true">◆</span>
            <span>Подскажем, как приготовить</span>
            <span aria-hidden="true">◆</span>
            <span>Доставка по Москве</span>
          </div>
        </div>

        <section className="feature section" id="fish" aria-labelledby="feature-title">
          <div className="section-shell">
            <div className="section-heading feature-heading">
              <div>
                <p className="eyebrow">Что продаем</p>
                <h2 id="feature-title">И на каждый день, и к особому случаю</h2>
              </div>
              <p className="section-intro">
                В небольшом магазине уживаются северная рыба, морепродукты,
                свежие стейки, собственная слабосоленая сельдь и икра.
              </p>
            </div>

            <div className="feature-grid">
              <figure className="feature-photo feature-photo-caviar">
                <img src={asset("/images/caviar.jpg")} alt="Красная икра крупным планом" />
                <figcaption>Красная икра · фасуем сами</figcaption>
              </figure>
              <article className="feature-card">
                <p className="feature-number">01</p>
                <div>
                  <p className="eyebrow">Сейчас в центре внимания</p>
                  <h3>Красная икра премиум-качества</h3>
                  <p>
                    Получаем икру с завода в куботейнерах и фасуем в лавке по
                    250 и 500 граммов. Другой объем тоже можно попросить.
                  </p>
                </div>
                <div className="feature-price">
                  <span>от</span>
                  <strong>3500 ₽</strong>
                  <span>за 250 г</span>
                </div>
                <a className="text-link" href={telegramOrder}>
                  Уточнить наличие <span aria-hidden="true">↗</span>
                </a>
              </article>
              <figure className="feature-photo feature-photo-salmon">
                <img
                  src={asset("/images/salmon-table.jpg")}
                  alt="Стейк лосося с лимоном и травами"
                />
                <figcaption>Рыбу разделываем в лавке</figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="about section" id="about" aria-labelledby="about-title">
          <img
            className="about-school"
            src={asset("/images/frame-27.png")}
            alt=""
            aria-hidden="true"
          />
          <div className="section-shell about-shell">
            <div className="about-copy">
              <p className="eyebrow">Еще одно хорошее место в Москве</p>
              <h2 id="about-title">Маленькая лавка с большим вниманием к рыбе</h2>
              <p className="about-lead">
                Мы изучаем поставщиков, выбираем свежий завоз и не держим
                склад: весь товар лежит в прилавках-холодильниках и быстро
                разбирается.
              </p>
              <div className="principles">
                <article>
                  <span>01</span>
                  <h3>Качество</h3>
                  <p>Рыба промысловой заморозки, которая не размораживалась в дороге.</p>
                </article>
                <article>
                  <span>02</span>
                  <h3>Ассортимент</h3>
                  <p>Понятная рыба для ужина и редкие продукты для эксперимента.</p>
                </article>
                <article>
                  <span>03</span>
                  <h3>Совет</h3>
                  <p>Подскажем, что выбрать, как разделать, посолить и приготовить.</p>
                </article>
              </div>
            </div>

            <figure className="owner-card">
              <img src={asset("/images/oleg.jpg")} alt="Олег Гугунава, владелец лавки" />
              <blockquote>
                «У нас весь бизнес основан на качестве товара и на нормах
                работы с продуктом. Поэтому мы можем гарантировать хорошую рыбу
                и морепродукты».
              </blockquote>
              <figcaption>
                <strong>Олег Гугунава</strong>
                <span>владелец лавки</span>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="gallery section" aria-labelledby="gallery-title">
          <div className="section-shell">
            <div className="section-heading gallery-heading">
              <div>
                <p className="eyebrow">Внутри лавки</p>
                <h2 id="gallery-title">Рыба, люди и немного хороших соусов</h2>
              </div>
              <a className="text-link" href="https://t.me/kapitanseledkin">
                Новости в Telegram <span aria-hidden="true">↗</span>
              </a>
            </div>
            <div className="gallery-grid">
              <figure className="gallery-wide">
                <img src={asset("/images/fish-04.jpg")} alt="Свежая рыба на разделочной доске" />
              </figure>
              <figure>
                <img src={asset("/images/fish-03.jpg")} alt="Разделка рыбы" />
              </figure>
              <figure>
                <img src={asset("/images/fish-08.jpg")} alt="Филе рыбы судовой заморозки" />
              </figure>
              <figure>
                <img src={asset("/images/fish-07.jpg")} alt="Соусы и приправы на полках лавки" />
              </figure>
              <figure>
                <img src={asset("/images/fish-11.jpg")} alt="Подготовка стейков тунца" />
              </figure>
            </div>
          </div>
        </section>

        <Catalog />

        <section className="delivery section" id="delivery" aria-labelledby="delivery-title">
          <div className="section-shell delivery-shell">
            <div className="delivery-image-wrap">
              <img
                src={asset("/images/statement-bg.jpg")}
                alt="Стейк лосося на сковороде"
              />
              <p>из лавки — на вашу кухню</p>
            </div>
            <div className="delivery-copy">
              <p className="eyebrow">Доставка</p>
              <h2 id="delivery-title">По Москве — обычно в течение двух часов</h2>
              <p>
                Доставка в пределах МКАД стоит 490 ₽. Минимальной суммы заказа
                нет: можно попросить и рыбу на ужин, и большой праздничный набор.
              </p>
              <dl>
                <div>
                  <dt>Стоимость</dt>
                  <dd>490 ₽ в пределах МКАД</dd>
                </div>
                <div>
                  <dt>Срок</dt>
                  <dd>обычно до 2 часов</dd>
                </div>
                <div>
                  <dt>Заказ</dt>
                  <dd>Telegram или WhatsApp</dd>
                </div>
              </dl>
              <div className="button-row">
                <a className="button button-primary" href={telegramOrder}>
                  Заказать в Telegram
                </a>
                <a className="button button-outline" href={whatsappOrder}>
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="contacts section" id="contacts" aria-labelledby="contacts-title">
          <div className="section-shell">
            <div className="contacts-grid">
              <div className="contacts-title">
                <p className="eyebrow">Заходите в гости</p>
                <h2 id="contacts-title">Лавка на улице Строителей</h2>
              </div>
              <address>
                <p>
                  Москва, ул. Строителей,
                  <br />д. 7, корп. 1
                </p>
                <span>метро «Вавиловская» · «Университет»</span>
              </address>
              <div className="contact-line">
                <span>Ежедневно</span>
                <strong>11:00—20:00</strong>
              </div>
              <div className="contact-line">
                <span>Телефон</span>
                <a href={phoneHref}>{phoneLabel}</a>
              </div>
            </div>
            <div className="social-row">
              <p>Новости, завозы и советы по приготовлению:</p>
              <div>
                <a href="https://t.me/kapitanseledkin">Telegram</a>
                <a href="https://www.youtube.com/channel/UCPc0ClmcBq3GXT2FAmMQy7A/videos">
                  YouTube
                </a>
                <a href="https://soundcloud.com/kapitanseledkin">SoundCloud</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="section-shell footer-grid">
          <img
            className="footer-logo"
            src={asset("/images/logo.png")}
            alt="Рыбная лавка капитана Селедкина"
          />
          <p>Качественная рыба на каждый день.</p>
          <a href="#top">Наверх <span aria-hidden="true">↑</span></a>
          <p className="copyright">© Рыбная лавка капитана Селедкина, 2026</p>
        </div>
      </footer>

      <nav className="mobile-order-bar" aria-label="Быстрый заказ">
        <a href={phoneHref}>Позвонить</a>
        <a href={telegramOrder}>Заказать в Telegram</a>
      </nav>
    </Typographed>
  );
}
