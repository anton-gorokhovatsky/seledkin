/* eslint-disable @next/next/no-img-element */
import { MobileNav } from "./mobile-nav";

export const phoneLabel = "+7 916 675-14-52";
export const phoneHref = "tel:+79166751452";
export const telegramOrder = "https://t.me/+79166751452";
export const whatsappOrder = "https://wa.me/79166751452";

const socialLinks = [
  {
    label: "телеграм",
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

export function SocialLinks({ light = false }: { light?: boolean }) {
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

export function SiteHeader({
  basePath,
  page,
}: {
  basePath: string;
  page: "home" | "catalog";
}) {
  const rootHref = `${basePath}/`;
  const homeAnchor = (id: string) =>
    page === "home" ? `#${id}` : `${rootHref}#${id}`;
  const catalogHref = page === "catalog" ? "#catalog" : `${basePath}/catalog/`;
  const links = [
    { href: homeAnchor("chto-prodaem"), label: "Что продаем" },
    { href: homeAnchor("o-nas"), label: "О лавке" },
    { href: catalogHref, label: "Каталог", current: page === "catalog" },
    { href: homeAnchor("zakaz-i-dostavka"), label: "Доставка" },
    { href: homeAnchor("kontakty"), label: "Контакты" },
  ];

  return (
    <>
      <header className="site-header">
        <div className="site-header__meta">
          <p>Москва · ул. Строителей, 7, корп. 1</p>
          <a href={phoneHref}>{phoneLabel}</a>
        </div>

        <div className="site-header__main">
          <a className="site-header__brand" href={rootHref} aria-label="На главную">
            <img
              src={`${basePath}/images/logo-redrawn.svg`}
              alt="Рыбная лавка капитана Селедкина"
            />
          </a>

          <nav className="site-header__nav" aria-label="Основная навигация">
            {links.map((link) => (
              <a
                href={link.href}
                key={`${link.href}-${link.label}`}
                aria-current={link.current ? "page" : undefined}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <a className="site-header__order" href={telegramOrder}>
            <span>Заказать</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      <MobileNav homeHref={rootHref} links={links} />
    </>
  );
}

export function ContactsSection() {
  return (
    <section className="contacts-source" id="kontakty" aria-labelledby="contacts-title">
      <iframe
        className="contacts-source__map"
        title="Карта проезда к магазину на улице Строителей"
        src="https://yandex.ru/map-widget/v1/?text=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0%2C%20%D1%83%D0%BB%D0%B8%D1%86%D0%B0%20%D0%A1%D1%82%D1%80%D0%BE%D0%B8%D1%82%D0%B5%D0%BB%D0%B5%D0%B9%2C%207%D0%BA1&z=15"
        loading="lazy"
      />
      <div className="contacts-source__card">
        <p className="section-kicker">Приехать в лавку</p>
        <h2 id="contacts-title">Магазин на улице Строителей</h2>
        <address>
          <p>
            <strong>Телефон:</strong> <a href={phoneHref}>{phoneLabel}</a>
          </p>
          <p>
            <strong>Адрес лавки:</strong> Москва, ул. Строителей, д. 7, корп. 1.
            Метро «Вавиловская», метро «Университет»
          </p>
          <p>
            <strong>Время работы:</strong>
            <br />Ежедневно с 11:00 до 20:00
          </p>
        </address>
        <SocialLinks />
      </div>
    </section>
  );
}

export function SiteFooter({ basePath }: { basePath: string }) {
  return (
    <footer className="source-footer">
      <div className="source-footer__feature">
        <figure className="source-footer__salmon">
          <img
            src={`${basePath}/images/salmon-cat.jpg`}
            alt="Кот Лосось греется на солнце с закрытыми глазами"
            loading="lazy"
            decoding="async"
          />
          <figcaption>Лосось, кот рыбной лавки</figcaption>
        </figure>

        <div className="source-footer__copy">
          <p className="source-footer__eyebrow">Кот Лосось</p>
          <h2>Ничего не рекламирует, просто напоминает.</h2>
          <p className="source-footer__postscript">
            P. S.: а еще мы публикуем советы по приготовлению и обработке рыбы,
            все наши новости, в т. ч. об ассортименте, в наших социальных сетях.
            <br />Подписывайтесь!
          </p>
          <div className="source-footer__actions">
            <a
              className="order-pill source-footer__channel"
              href="https://t.me/kapitanseledkin"
            >
              Читать в телеграме
            </a>
            <SocialLinks light />
          </div>
        </div>
      </div>
      <div className="source-footer__rule" />
      <small>© «Рыбная лавка капитана Селедкина», 2026</small>
    </footer>
  );
}
