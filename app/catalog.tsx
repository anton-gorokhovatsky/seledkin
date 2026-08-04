"use client";

import { useMemo, useState } from "react";
import { catalog, catalogUpdated } from "./products";

const allCategories = "all";

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

export function Catalog() {
  const [activeCategory, setActiveCategory] = useState(allCategories);
  const [query, setQuery] = useState("");

  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalize(query);

    return catalog.flatMap((category) => {
      if (
        activeCategory !== allCategories &&
        category.slug !== activeCategory
      ) {
        return [];
      }

      return category.items
        .filter((product) => {
          if (!normalizedQuery) return true;

          return normalize(
            `${product.name} ${product.description ?? ""}`,
          ).includes(normalizedQuery);
        })
        .map((product) => ({ ...product, category: category.shortLabel }));
    });
  }, [activeCategory, query]);

  return (
    <section className="catalog section" id="catalog" aria-labelledby="catalog-title">
      <div className="section-shell">
        <div className="catalog-heading section-heading">
          <div>
            <p className="eyebrow">Каталог · {catalogUpdated}</p>
            <h2 id="catalog-title">Что сейчас в прайс-листе</h2>
          </div>
          <p className="section-intro">
            Наличие и цена могут измениться. Перед поездкой напишите или
            позвоните — отложим нужное и честно скажем, что есть сегодня.
          </p>
        </div>

        <div className="catalog-controls">
          <label className="catalog-search">
            <span className="visually-hidden">Поиск по каталогу</span>
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Найти, например, нерку"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <div className="category-list" aria-label="Категории каталога">
            <button
              type="button"
              className={activeCategory === allCategories ? "is-active" : ""}
              aria-pressed={activeCategory === allCategories}
              onClick={() => setActiveCategory(allCategories)}
            >
              Все
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
        </div>

        <p className="catalog-count" aria-live="polite">
          {filteredProducts.length === 0
            ? "Ничего не найдено"
            : positionCount(filteredProducts.length)}
        </p>

        {filteredProducts.length > 0 ? (
          <div className="product-grid">
            {filteredProducts.map((product, index) => (
              <article
                className="product-card"
                key={`${product.category}-${product.name}-${product.price}-${index}`}
              >
                <p className="product-category">{product.category}</p>
                <div className="product-title-row">
                  <h3>{product.name}</h3>
                  <p className="product-price">{product.price}</p>
                </div>
                {product.description ? <p>{product.description}</p> : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="catalog-empty">
            <p>Попробуйте другое название или откройте все категории.</p>
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setQuery("");
                setActiveCategory(allCategories);
              }}
            >
              Сбросить поиск
            </button>
          </div>
        )}

        <div className="catalog-order">
          <div>
            <p className="eyebrow">Есть вопрос по продукту?</p>
            <p>Напишите — поможем выбрать и подскажем, как приготовить.</p>
          </div>
          <div className="button-row">
            <a className="button button-light" href="https://t.me/+79166751452">
              Заказать в Telegram
            </a>
            <a className="button button-outline-light" href="https://wa.me/79166751452">
              Написать в WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
