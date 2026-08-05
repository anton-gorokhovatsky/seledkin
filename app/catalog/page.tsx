/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { Catalog } from "../catalog";
import { ContactWidget } from "../contact-widget";
import { CurrentMonth } from "../current-month";
import { catalogUpdated, catalogUpdatedAt } from "../products";
import {
  SiteFooter,
  SiteHeader,
  telegramOrder,
} from "../site-components";
import { Typographed } from "../typography";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const siteUrl = basePath
  ? `https://anton-gorokhovatsky.github.io${basePath}`
  : "https://ks.fish";

export const metadata: Metadata = {
  title: "Каталог и цены",
  description:
    "Полный каталог рыбы, морепродуктов, икры и деликатесов Рыбной лавки капитана Селедкина.",
  alternates: {
    canonical: `${siteUrl}/catalog/`,
  },
};

export default function CatalogPage() {
  const fishSchoolImage = `${basePath}/images/fish-school.svg`;

  return (
    <Typographed>
      <a className="skip-link" href="#catalog">
        Перейти к каталогу
      </a>

      <SiteHeader basePath={basePath} page="catalog" />

      <main className="catalog-page" id="content">
        <section className="catalog-page__hero" id="top" aria-labelledby="catalog-page-title">
          <div className="story-shell catalog-page__hero-copy">
            <p className="section-kicker">Рыба и морепродукты · Москва</p>
            <h1 id="catalog-page-title">Каталог</h1>
            <p>
              Полный ассортимент и ориентировочные цены из прайс-листа от{" "}
              <time dateTime={catalogUpdatedAt}>{catalogUpdated}</time>. На{" "}
              <CurrentMonth /> стоимость и наличие уточняйте.
            </p>
          </div>
          <img
            className="catalog-page__fish-school"
            src={fishSchoolImage}
            alt=""
            aria-hidden="true"
          />
        </section>

        <Catalog />

        <aside className="catalog-page__closing" aria-label="Помощь с выбором">
          <div className="story-shell catalog-page__closing-inner">
            <p className="section-kicker">Не нашли нужное?</p>
            <p>
              Напишите в лавку: уточним наличие, актуальную цену и подскажем,
              что выбрать.
            </p>
            <a className="hero-button hero-button--primary" href={telegramOrder}>
              Спросить в телеграме
            </a>
          </div>
        </aside>
      </main>

      <SiteFooter basePath={basePath} />
      <ContactWidget />
    </Typographed>
  );
}
