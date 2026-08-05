"use client";

import { useMemo, useState } from "react";
import { HarpoonIcon } from "./harpoon-icon";
import { SeaPattern } from "./sea-pattern";
import {
  catalog,
  type CatalogItem,
} from "./products";

const allCategories = "all";
const telegramOrder = "https://t.me/+79166751452";

function normalize(value: string) {
  return value
    .toLocaleLowerCase("ru-RU")
    .replaceAll("ё", "е")
    .replaceAll("\u00a0", " ")
    .replaceAll("\u202f", " ")
    .trim();
}

function positionCount(value: number) {
  const lastTwo = value % 100;
  const last = value % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return `${value} позиций`;
  if (last === 1) return `${value} позиция`;
  if (last >= 2 && last <= 4) return `${value} позиции`;
  return `${value} позиций`;
}

function telegramProductHref(product: CatalogItem) {
  const details = product.description ? ` (${product.description})` : "";
  const message = `Здравствуйте! Подскажите, пожалуйста, есть ли сейчас «${product.name}»${details}?`;

  return `${telegramOrder}?text=${encodeURIComponent(message)}`;
}

export function Catalog() {
  const [activeCategory, setActiveCategory] = useState(allCategories);
  const [query, setQuery] = useState("");

  const visibleCategories = useMemo(
    () => {
      const normalizedQuery = normalize(query);

      return catalog
        .filter(
          (category) =>
            activeCategory === allCategories || category.slug === activeCategory,
        )
        .map((category) => ({
          ...category,
          items: category.items.filter((product) => {
            if (!normalizedQuery) return true;

            return normalize(
              `${product.name} ${product.description ?? ""}`,
            ).includes(normalizedQuery);
          }),
        }))
        .filter((category) => category.items.length > 0);
    },
    [activeCategory, query],
  );

  const visibleCount = visibleCategories.reduce(
    (total, category) => total + category.items.length,
    0,
  );

  return (
    <section className="catalog-source wave-backed" id="catalog" aria-labelledby="catalog-title">
      <SeaPattern id="catalog-products" />
      <div className="catalog-source__heading">
        <h2 id="catalog-title">Наши товары и цены</h2>
      </div>

      <div className="source-shell catalog-source__controls">
        <label className="catalog-search">
          <span className="visually-hidden">Поиск по каталогу</span>
          <input
            type="search"
            placeholder="Найти, например, нерку"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <span className="catalog-search__mark" aria-hidden="true">
            Поиск
          </span>
        </label>

        <div className="catalog-tabs" role="group" aria-label="Категории каталога">
          <button
            type="button"
            className={activeCategory === allCategories ? "is-active" : ""}
            aria-pressed={activeCategory === allCategories}
            onClick={() => setActiveCategory(allCategories)}
          >
            Весь ассортимент
          </button>
          {catalog.map((category) => (
            <button
              type="button"
              key={category.slug}
              className={activeCategory === category.slug ? "is-active" : ""}
              aria-pressed={activeCategory === category.slug}
              onClick={() => setActiveCategory(category.slug)}
            >
              {category.shortLabel}
            </button>
          ))}
        </div>

        <label className="catalog-select">
          <span className="visually-hidden">Категория каталога</span>
          <select
            value={activeCategory}
            onChange={(event) => setActiveCategory(event.target.value)}
          >
            <option value={allCategories}>Весь ассортимент</option>
            {catalog.map((category) => (
              <option value={category.slug} key={category.slug}>
                {category.shortLabel}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="source-shell catalog-source__result" aria-live="polite" aria-atomic="true">
        {visibleCount === 0 ? "Ничего не найдено" : positionCount(visibleCount)}
      </p>

      {visibleCount > 0 ? (
        <div className="source-shell catalog-products">
          {visibleCategories.map((category) => (
            <section
              className="catalog-category"
              id={`category-${category.slug}`}
              key={category.slug}
            >
              <h3>{category.label}</h3>
              <div className="catalog-product-grid">
                {category.items.map((product, index) => (
                  <article
                    className="catalog-product"
                    key={`${category.slug}-${product.name}-${product.price}-${index}`}
                  >
                    <div className="catalog-product__line">
                      <h4>{product.name}</h4>
                      <strong>{product.price}</strong>
                    </div>
                    <div className="catalog-product__details">
                      {product.description ? <p>{product.description}</p> : null}
                      <a
                        className="catalog-product__action"
                        href={telegramProductHref(product)}
                        aria-label={`Уточнить наличие: ${product.name}`}
                      >
                        Уточнить наличие
                        <HarpoonIcon />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="source-shell catalog-empty">
          <p>Попробуйте другое название или откройте все категории.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActiveCategory(allCategories);
            }}
          >
            Сбросить поиск
          </button>
        </div>
      )}

      <div className="catalog-source__order">
        <a className="order-pill order-pill--telegram" href="https://t.me/+79166751452">
          Заказать в Телеграме
        </a>
        <a className="order-pill order-pill--whatsapp" href="https://wa.me/79166751452">
          Заказать в WhatsApp
        </a>
      </div>
    </section>
  );
}
