"use client";

import { useEffect, useRef } from "react";

type PriceNoticeProps = {
  whatsappOrder: string;
  fishImage: string;
};

const storageKey = "seledkin-price-notice-seen";

export function PriceNotice({ whatsappOrder, fishImage }: PriceNoticeProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (window.sessionStorage.getItem(storageKey)) return;

    function showNotice() {
      const dialog = dialogRef.current;
      if (!dialog || dialog.open || window.scrollY < 480) return;

      const menuButton = document.querySelector<HTMLElement>(".floating-nav summary");
      menuButton?.focus({ preventScroll: true });
      returnFocusRef.current = menuButton;
      dialog.showModal();
      window.removeEventListener("scroll", showNotice);
    }

    window.addEventListener("scroll", showNotice, { passive: true });
    return () => window.removeEventListener("scroll", showNotice);
  }, []);

  function closeNotice() {
    window.sessionStorage.setItem(storageKey, "true");
    dialogRef.current?.close();
    returnFocusRef.current?.focus({ preventScroll: true });
  }

  return (
    <dialog
      className="price-notice"
      ref={dialogRef}
      aria-labelledby="price-notice-title"
      aria-describedby="price-notice-copy"
      onCancel={(event) => {
        event.preventDefault();
        closeNotice();
      }}
    >
      <button
        className="price-notice__close"
        type="button"
        aria-label="Закрыть сообщение"
        onClick={closeNotice}
      >
        ×
      </button>
      <h2 id="price-notice-title">Друзья!</h2>
      <p id="price-notice-copy">
        Из-за изменения курса валют поставщики меняют цены ежедневно.
        Пожалуйста, уточняйте актуальные цены перед заказом.
      </p>
      <a className="order-pill order-pill--whatsapp" href={whatsappOrder}>
        Уточнить в WhatsApp
      </a>
      {/* Decorative motif from the original popup. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={fishImage} alt="" aria-hidden="true" />
    </dialog>
  );
}
