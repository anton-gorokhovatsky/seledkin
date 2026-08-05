/* eslint-disable @next/next/no-img-element */
import { MobileNav } from "./mobile-nav";
import { HarpoonIcon } from "./harpoon-icon";
import { SeaPattern } from "./sea-pattern";
import { Typographed } from "./typography";

export const phoneLabel = "+7\u00a0916\u00a0675\u201114\u201152";
export const phoneHref = "tel:+79166751452";
export const telegramOrder = "https://t.me/+79166751452";
export const whatsappOrder = "https://wa.me/79166751452";

const socialLinks = [
  {
    label: "Телеграм",
    href: "https://t.me/kapitanseledkin",
    icon: "telegram",
  },
  {
    label: "X (Twitter)",
    href: "https://twitter.com/kapitanseledkin",
    icon: "x",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/channel/UCPc0ClmcBq3GXT2FAmMQy7A/videos",
    icon: "youtube",
  },
  {
    label: "SoundCloud",
    href: "https://soundcloud.com/kapitanseledkin",
    icon: "soundcloud",
  },
] as const;

function SocialIcon({ name }: { name: (typeof socialLinks)[number]["icon"] }) {
  if (name === "telegram") {
    return (
      <svg className="social-icon" aria-hidden="true" viewBox="0 0 24 24">
        <path d="M21.5 3.2 2.9 10.3c-1.2.5-1.2 1.2-.2 1.5l4.8 1.5 1.8 5.7c.2.7.8.9 1.4.4l2.7-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8L23 4.7c.3-1.3-.5-1.9-1.5-1.5ZM8.8 12.9l9.2-5.8c.5-.3.9-.1.5.2l-7.6 6.9-.3 3.2-1.8-4.5Z" />
      </svg>
    );
  }

  if (name === "x") {
    return (
      <svg className="social-icon" aria-hidden="true" viewBox="0 0 24 24">
        <path d="M18.2 2.3h3.3l-7.2 8.2 8.5 11.2h-6.7l-5.2-6.8-6 6.8H1.7l7.7-8.8L1.3 2.3h6.8l4.7 6.2 5.4-6.2Zm-1.1 17.5h1.8L7.1 4.1h-2l12 15.7Z" />
      </svg>
    );
  }

  if (name === "youtube") {
    return (
      <svg className="social-icon" aria-hidden="true" viewBox="0 0 24 24">
        <rect
          x="2.3"
          y="5.5"
          width="19.4"
          height="13"
          rx="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path d="m10 8.7 5.4 3.3-5.4 3.3Z" />
      </svg>
    );
  }

  return (
    <svg
      className="social-icon"
      aria-hidden="true"
      viewBox="0 0 24 24"
    >
      <path
        className="social-icon__soundcloud"
        d="M3 12.2v4.3m2.5-6.2v6.2M8 8.1v8.4m2.5-10.2v10.2M13 9.5a4.2 4.2 0 0 1 7.8 2.1 2.6 2.6 0 0 1-.2 5.2H13"
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
          href={link.href}
          key={link.label}
          aria-label={link.label}
        >
          <SocialIcon name={link.icon} />
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
    <Typographed>
      <header className="site-header">
        <div className="site-header__meta">
          <p>Москва · м. «Вавиловская» · ул. Строителей, 7, корп. 1</p>
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
            <HarpoonIcon />
          </a>
        </div>
      </header>

      <MobileNav homeHref={rootHref} links={links} />
    </Typographed>
  );
}

export function ContactsSection() {
  return (
    <Typographed>
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
              Около 300 м от метро «Вавиловская».
            </p>
            <p>
              <strong>Время работы:</strong>
              <br />Ежедневно, 11:00—20:00
            </p>
          </address>
          <SocialLinks />
        </div>
      </section>
    </Typographed>
  );
}

export function SiteFooter({ basePath }: { basePath: string }) {
  return (
    <Typographed>
      <footer className="source-footer wave-backed">
        <SeaPattern id="footer" tone="blue" />
        <div className="source-footer__feature">
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
                Читать в Телеграме
              </a>
              <SocialLinks light />
            </div>
          </div>

          <figure className="source-footer__salmon">
            <img
              src={`${basePath}/images/salmon-cat.jpg`}
              alt="Кот Лосось греется на солнце с закрытыми глазами"
              loading="lazy"
              decoding="async"
            />
            <figcaption>Лосось, кот рыбной лавки</figcaption>
          </figure>
        </div>
        <div className="source-footer__base">
          <small>© «Рыбная лавка капитана Селедкина», 2026</small>
          <p>Москва · м. «Вавиловская»</p>
          <p>Ежедневно, 11:00—20:00</p>
        </div>
      </footer>
    </Typographed>
  );
}
