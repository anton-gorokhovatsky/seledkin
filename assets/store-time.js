import { store } from "./store-data.js";

const dayMs = 86_400_000;
const minutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const formatters = new Map();

export function storeClock(date = new Date(), timeZone = store.timeZone) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
  try {
    if (!formatters.has(timeZone)) formatters.set(timeZone, new Intl.DateTimeFormat("en-GB", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }));
    const parts = Object.fromEntries(formatters.get(timeZone).formatToParts(date)
      .filter(({ type }) => type !== "literal").map(({ type, value }) => [type, value]));
    const elapsed = ((Number(parts.hour) % 24 * 60 + Number(parts.minute)) * 60 + Number(parts.second)) * 1000 + date.getMilliseconds();
    return { date: `${parts.year}-${parts.month}-${parts.day}`, elapsed };
  } catch {
    return null;
  }
}

export function hoursForDate(date, schedule = store) {
  return Object.hasOwn(schedule.exceptions, date) ? schedule.exceptions[date] : schedule.hours;
}

function dateAfter(date, days) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * dayMs).toISOString().slice(0, 10);
}

export function storeStatus(date = new Date(), schedule = store) {
  const clock = storeClock(date, schedule.timeZone);
  if (!clock) return null;
  const today = hoursForDate(clock.date, schedule);
  const opening = today ? minutes(today.open) * 60_000 : null;
  const closing = today ? minutes(today.close) * 60_000 : null;
  if (today && clock.elapsed >= opening && clock.elapsed < closing) {
    return { isOpen: true, label: `Сегодня открыто до\u00a0${today.close}`, nextChange: closing - clock.elapsed };
  }
  // A regular daily schedule always resumes after the finite list of exceptions.
  for (let days = 0; days <= Object.keys(schedule.exceptions).length + 1; days++) {
    const key = dateAfter(clock.date, days);
    const hours = hoursForDate(key, schedule);
    if (!hours || (days === 0 && clock.elapsed >= minutes(hours.open) * 60_000)) continue;
    const when = days === 0 ? "сегодня" : days === 1 ? "завтра" : new Intl.DateTimeFormat("ru-RU", {
      day: "numeric", month: "long", timeZone: "UTC",
    }).format(new Date(`${key}T12:00:00Z`)).replaceAll(" ", "\u00a0");
    return {
      isOpen: false,
      label: `Откроемся ${when} в\u00a0${hours.open}`,
      nextChange: days * dayMs + minutes(hours.open) * 60_000 - clock.elapsed,
    };
  }
  return null;
}
