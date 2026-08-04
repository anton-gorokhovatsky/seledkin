"use client";

import { useRef } from "react";

const links = [
  ["#fish", "Что продаем"],
  ["#about", "О лавке"],
  ["#catalog", "Каталог"],
  ["#delivery", "Доставка"],
  ["#contacts", "Контакты"],
] as const;

export function MobileNav() {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);

  function closeMenu() {
    if (!detailsRef.current) return;

    detailsRef.current.open = false;
    requestAnimationFrame(() => summaryRef.current?.focus({ preventScroll: true }));
  }

  return (
    <details className="mobile-nav" ref={detailsRef}>
      <summary aria-label="Открыть меню" ref={summaryRef}>
        <span>Меню</span>
        <span aria-hidden="true">+</span>
      </summary>
      <nav aria-label="Мобильная навигация">
        {links.map(([href, label]) => (
          <a href={href} key={href} onClick={closeMenu}>
            {label}
          </a>
        ))}
      </nav>
    </details>
  );
}
