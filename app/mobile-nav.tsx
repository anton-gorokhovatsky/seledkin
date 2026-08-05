"use client";

import { useEffect, useRef } from "react";

type MobileNavLink = {
  href: string;
  label: string;
  current?: boolean;
};

const fallbackLinks: MobileNavLink[] = [
  { href: "#chto-prodaem", label: "Что продаем" },
  { href: "#o-nas", label: "О лавке" },
  { href: "#catalog", label: "Каталог" },
  { href: "#zakaz-i-dostavka", label: "Доставка" },
  { href: "#kontakty", label: "Контакты" },
];

export function MobileNav({
  homeHref = "#top",
  links = fallbackLinks,
}: {
  homeHref?: string;
  links?: MobileNavLink[];
} = {}) {
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
        <a className="floating-nav__logo" href={homeHref} onClick={closeMenu}>
          Рыбная лавка<br />{" "}капитана Селедкина
        </a>
        {links.map((link) => (
          <a
            href={link.href}
            key={`${link.href}-${link.label}`}
            aria-current={link.current ? "page" : undefined}
            onClick={closeMenu}
          >
            {link.label}
          </a>
        ))}
        <a className="floating-nav__order" href="https://t.me/+79166751452">
          Заказать в телеграме
        </a>
      </nav>
    </details>
  );
}
