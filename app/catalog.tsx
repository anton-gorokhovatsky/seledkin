"use client";

import { useMemo, useState } from "react";
import { catalog } from "./products";

const allCategories = "all";

export function Catalog() {
  const [activeCategory, setActiveCategory] = useState(allCategories);

  const visibleCategories = useMemo(
    () =>
      activeCategory === allCategories
        ? catalog
        : catalog.filter((category) => category.slug === activeCategory),
    [activeCategory],
  );

  const visibleCount = visibleCategories.reduce(
    (total, category) => total + category.items.length,
    0,
  );

  return (
    <section className="catalog-source" id="catalog" aria-labelledby="catalog-title">
      <div className="catalog-source__heading">
        <h2 id="catalog-title">
          Наши товары и цены
          <span>в январе 2026 года</span>
        </h2>
        <p>
          Цены на некоторые позиции могут меняться в большую или меньшую
          сторону. Пожалуйста, уточняйте перед поездкой в магазин наличие и
          стоимость интересующих позиций по телефону:{" "}
          <a href="tel:+79166751452">+7 916 675-14-52</a>
        </p>
      </div>

      <div className="source-shell catalog-source__controls">
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

      <p className="visually-hidden" aria-live="polite">
        Показано позиций: {visibleCount}
      </p>

      <div className="source-shell catalog-products">
        {visibleCategories.map((category) => (
          <section className="catalog-category" key={category.slug}>
            <h3 className="visually-hidden">{category.label}</h3>
            <div className="catalog-product-grid">
              {category.items.map((product, index) => (
                <article
                  className="catalog-product"
                  key={`${category.slug}-${product.name}-${product.price}-${index}`}
                >
                  <div>
                    <h4>{product.name}</h4>
                    <strong>{product.price}</strong>
                  </div>
                  {product.description ? <p>{product.description}</p> : null}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="catalog-source__order">
        <a className="order-pill order-pill--whatsapp" href="https://wa.me/79166751452">
          Заказать в WhatsApp
        </a>
        <a className="order-pill order-pill--telegram" href="https://t.me/+79166751452">
          Заказать в Telegram
        </a>
      </div>
    </section>
  );
}
