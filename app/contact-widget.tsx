"use client";

import { useEffect, useRef, useState } from "react";

const phoneHref = "tel:+79166751452";
const whatsappHref = "https://wa.me/79166751452";
const telegramHref = "https://t.me/+79166751452";

function ChatIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 35 32">
      <path d="M11.27 12.7h12.1M11.27 16.47h12.1M4.81 23.58C2.43 21.19 1 18.12 1 14.77 1 7.17 8.39 1 17.5 1S34 7.17 34 14.77s-7.39 13.78-16.5 13.78c-1.87 0-3.67-.26-5.35-.74L12 27.79 5.03 31v-7.18l-.22-.24Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m5 5 14 14M19 5 5 19" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 50 50">
      <circle cx="25" cy="25" r="25" />
      <path d="m12.6 24.4 24.1-9.3c1.1-.4 2.1.3 1.7 2.2l-4.1 19.2c-.3 1.4-1.1 1.8-2.3 1.1l-6.2-4.6-3 2.9c-.3.3-.6.6-1.2.6l.4-6.3 11.5-10.4c.5-.4-.1-.7-.8-.3L18.5 28.4l-6.1-1.9c-1.3-.4-1.4-1.3.2-2.1Z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 50 50">
      <circle cx="25" cy="25" r="25" />
      <path d="M25.1 11.2a13.7 13.7 0 0 0-11.7 20.9l-1.8 6.6 6.8-1.8a13.7 13.7 0 1 0 6.7-25.7Zm0 24.9c-2.1 0-4.1-.6-5.8-1.6l-.4-.2-4 .9 1.1-3.9-.3-.4a11.2 11.2 0 1 1 9.4 5.2Zm6.1-8.4c-.3-.2-2-.9-2.3-1-.3-.1-.5-.2-.8.2-.2.3-.9 1.1-1.1 1.3-.2.2-.4.3-.7.1-2-.9-3.4-2.1-4.5-4-.3-.5.3-.5.9-1.7.1-.2.1-.5 0-.7l-1-2.5c-.3-.6-.6-.5-.9-.5h-.7c-.3 0-.7.1-1 .5-.4.4-1.4 1.4-1.4 3.4 0 2 1.5 4 1.7 4.2.2.3 2.9 4.5 7.1 6.2 2.7 1.2 3.8 1.3 5.1 1.1 1-.1 2.9-1.2 3.3-2.3.4-1.1.4-2 .3-2.2-.2-.2-.4-.3-.8-.5Z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 50 50">
      <circle cx="25" cy="25" r="25" />
      <path d="M18.3 14.7c.6-.3 1.3 0 1.6.6l2.5 5.8c.2.5.1 1-.3 1.4l-2.1 2c1.6 3.1 4.2 5.7 7.4 7.3l2-2.1c.4-.4.9-.5 1.4-.3l5.8 2.5c.6.3.9 1 .6 1.6l-1.3 3c-.3.7-1 1.1-1.8 1-10.8-1.4-19.3-10-20.7-20.7-.1-.8.3-1.5 1-1.8l3.9-1.3Z" />
      <path className="contact-widget__phone-wave" d="M28.7 14.1a8.3 8.3 0 0 1 7.2 7.2M28.9 18.6a3.8 3.8 0 0 1 2.5 2.5" />
    </svg>
  );
}

const actions = [
  { label: "Telegram", slug: "telegram", href: telegramHref, icon: <TelegramIcon /> },
  { label: "WhatsApp", slug: "whatsapp", href: whatsappHref, icon: <WhatsAppIcon /> },
  { label: "Телефон", slug: "phone", href: phoneHref, icon: <PhoneIcon /> },
] as const;

export function ContactWidget() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      requestAnimationFrame(() => buttonRef.current?.focus({ preventScroll: true }));
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <div className={`contact-widget${open ? " is-open" : ""}`}>
      <nav
        className="contact-widget__actions"
        id="contact-widget-actions"
        aria-label="Связаться с лавкой"
        aria-hidden={!open}
      >
        {actions.map((action) => (
          <a
            className={`contact-widget__action contact-widget__action--${action.slug}`}
            href={action.href}
            aria-label={action.label}
            key={action.label}
            rel="noreferrer"
            target={action.href.startsWith("http") ? "_blank" : undefined}
          >
            <span className="contact-widget__label" aria-hidden="true">
              {action.label}
            </span>
            {action.icon}
          </a>
        ))}
      </nav>

      <button
        className="contact-widget__toggle"
        type="button"
        aria-label={open ? "Закрыть способы связи" : "Открыть способы связи"}
        aria-controls="contact-widget-actions"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        ref={buttonRef}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>
    </div>
  );
}
