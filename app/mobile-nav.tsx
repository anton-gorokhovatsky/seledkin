"use client";

import { useEffect, useRef } from "react";

const links = [
  ["#chto-prodaem", "Что продаем"],
  ["#o-nas", "О нас"],
  ["#catalog", "Продукты и цены"],
  ["#novosti", "Новости"],
  ["#zakaz-i-dostavka", "Доставка"],
  ["#kontakty", "Контакты"],
] as const;

export function MobileNav() {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || !detailsRef.current?.open) return;
      closeMenu();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  function closeMenu() {
    if (!detailsRef.current) return;
    detailsRef.current.open = false;
    requestAnimationFrame(() => summaryRef.current?.focus({ preventScroll: true }));
  }

  return (
    <details className="floating-nav" ref={detailsRef}>
      <summary aria-label="Открыть меню" ref={summaryRef}>
        <span className="visually-hidden">Меню</span>
        <span className="burger" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </summary>
      <nav aria-label="Меню сайта">
        <a className="floating-nav__logo" href="#top" onClick={closeMenu}>
          Рыбная лавка<br />капитана Селедкина
        </a>
        {links.map(([href, label]) => (
          <a href={href} key={href} onClick={closeMenu}>
            {label}
          </a>
        ))}
        <a className="floating-nav__order" href="https://t.me/+79166751452">
          Заказать в Telegram
        </a>
      </nav>
    </details>
  );
}
