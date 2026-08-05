"use client";

const monthNames = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
] as const;

function currentMonthInMoscow() {
  const parts = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);

  return {
    dateTime: `${year}-${String(month).padStart(2, "0")}`,
    label: `${monthNames[month - 1]}\u00a0${year}\u00a0года`,
  };
}

export function CurrentMonth() {
  const current = currentMonthInMoscow();

  return (
    <time
      data-current-month="true"
      dateTime={current.dateTime}
      suppressHydrationWarning
    >
      {current.label}
    </time>
  );
}
