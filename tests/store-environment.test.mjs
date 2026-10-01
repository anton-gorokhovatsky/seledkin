import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { store } from "../assets/store-data.js";
import { storeClock, storeStatus } from "../assets/store-time.js";
import { solarPosition, seaLight } from "../assets/sea-light.js";
import { scheduledTheme } from "../assets/theme.js";
import { renderTheme } from "../scripts/site-content.mjs";

test("shop status follows Moscow, including opening, closing and local midnight", () => {
  for (const [utc, open, label, next] of [
    ["2026-10-01T07:59:59.900Z", false, "Откроемся сегодня в 11:00", 100],
    ["2026-10-01T08:00:00Z", true, "Сегодня открыто до 20:00", 9 * 3_600_000],
    ["2026-10-01T16:59:59.900Z", true, "Сегодня открыто до 20:00", 100],
    ["2026-10-01T17:00:00Z", false, "Откроемся завтра в 11:00", 15 * 3_600_000],
    ["2026-10-01T21:00:00Z", false, "Откроемся сегодня в 11:00", 11 * 3_600_000],
    ["2026-12-31T21:00:00Z", false, "Откроемся сегодня в 11:00", 11 * 3_600_000],
  ]) {
    assert.deepEqual(storeStatus(new Date(utc)), { isOpen: open, label, nextChange: next });
  }
  assert.equal(storeClock(new Date("2026-12-31T21:00:00Z")).date, "2027-01-01");
  assert.equal(storeStatus(new Date("invalid")), null);
});

test("explicit shorter days and closures cross month/year boundaries without invented hours", () => {
  const fixture = { ...store, exceptions: {
    "2026-12-31": { open: "12:30", close: "18:15" }, "2027-01-01": null, "2027-01-02": null,
  } };
  assert.equal(storeStatus(new Date("2026-12-31T09:00:00Z"), fixture).label, "Откроемся сегодня в 12:30");
  assert.equal(storeStatus(new Date("2026-12-31T09:30:00Z"), fixture).label, "Сегодня открыто до 18:15");
  assert.equal(storeStatus(new Date("2026-12-31T15:15:00Z"), fixture).label, "Откроемся 3 января в 11:00");
  assert.equal(storeStatus(new Date("2027-01-01T12:00:00Z"), fixture).label, "Откроемся 3 января в 11:00");
  assert.equal(storeStatus(new Date("2027-01-02T12:00:00Z"), fixture).label, "Откроемся завтра в 11:00");
  assert.deepEqual(store.exceptions, {}, "Production has no unconfirmed holiday overrides");
});

test("generated store data and pre-paint theme agree with the runtime across boundaries", () => {
  const source = JSON.parse(readFileSync(new URL("../content/site.json", import.meta.url))).store;
  assert.deepEqual(store, source);
  const bootstrap = renderTheme("journal").replace(/<\/?script>/g, "");
  for (const utc of ["2026-10-01T07:59:59Z", "2026-10-01T08:00:00Z", "2026-10-01T16:59:59Z", "2026-10-01T17:00:00Z"]) {
    for (const explicit of [null, "light", "dark"]) {
      const root = { dataset: {}, style: {}, classList: { add() {} } };
      const now = new Date(utc);
      vm.runInNewContext(bootstrap, {
        document: { documentElement: root, querySelector: () => ({}) },
        localStorage: { getItem: () => explicit },
        window: { matchMedia: () => ({ matches: true }) }, Intl,
        Date: class extends Date { constructor() { super(now); } },
      });
      assert.equal(root.dataset.theme, explicit ?? scheduledTheme(now));
    }
  }
});

test("solar light is seasonal, UTC-based and bounded; it does not infer weather", () => {
  const summer = solarPosition(new Date("2026-06-21T09:30:00Z"));
  const winter = solarPosition(new Date("2026-12-21T09:30:00Z"));
  assert.ok(summer.altitude > 56 && summer.altitude < 59);
  assert.ok(winter.altitude > 9 && winter.altitude < 13);
  assert.ok(Math.abs(summer.hourAngle) < 2);
  assert.equal(seaLight(new Date("2026-10-01T21:00:00Z")).phase, "night");
  assert.equal(seaLight(new Date("2026-10-01T15:00:00Z")).phase, "evening");
  assert.deepEqual(seaLight(new Date("2026-10-01T12:00:00+03:00")), seaLight(new Date("2026-10-01T09:00:00Z")));
  for (const day of ["2026-01-01", "2026-03-21", "2026-06-21", "2026-09-23", "2026-12-31", "2028-02-29"]) {
    for (let hour = 0; hour < 24; hour++) {
      const light = seaLight(new Date(`${day}T${String(hour).padStart(2, "0")}:00:00Z`));
      assert.ok(light.silver >= 0 && light.silver <= 0.14);
      assert.ok(light.warmth >= 0 && light.warmth <= 0.16);
      assert.ok(light.position >= 30 && light.position <= 70);
    }
  }
  assert.equal(solarPosition(new Date("invalid")), null);
  assert.equal(solarPosition(new Date(), { latitude: 100, longitude: 0 }), null);
});
