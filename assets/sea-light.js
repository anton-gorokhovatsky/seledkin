import { store } from "./store-data.js";

const rad = Math.PI / 180;
const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));

// NOAA's approximate solar equations; UTC input avoids the visitor's timezone.
// https://gml.noaa.gov/grad/solcalc/solareqns.PDF
export function solarPosition(date = new Date(), coordinates = store.coordinates) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
  const { latitude, longitude } = coordinates;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const daysInYear = (Date.UTC(year + 1, 0, 1) - start) / 86_400_000;
  const day = (date.getTime() - start) / 86_400_000;
  const gamma = 2 * Math.PI / daysInYear * (day - 0.5);
  const equation = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const solarMinutes = ((utcMinutes + equation + 4 * longitude) % 1440 + 1440) % 1440;
  const hourAngle = solarMinutes / 4 - 180;
  const altitude = Math.asin(clamp(Math.sin(latitude * rad) * Math.sin(declination)
    + Math.cos(latitude * rad) * Math.cos(declination) * Math.cos(hourAngle * rad), -1, 1)) / rad;
  return { altitude, hourAngle };
}

export function seaLight(date = new Date(), coordinates = store.coordinates) {
  const sun = solarPosition(date, coordinates);
  if (!sun) return null;
  const daylight = clamp((sun.altitude + 6) / 30);
  // A low, setting sun warms the horizon; these are light states, not weather reports.
  const evening = sun.hourAngle > 0 ? clamp((12 - sun.altitude) / 12) * clamp((sun.altitude + 6) / 6) : 0;
  return {
    phase: sun.altitude < -6 ? "night" : evening > 0.25 ? "evening" : sun.altitude > 20 ? "day" : "low-sun",
    silver: Number((daylight * (1 - evening) * 0.14).toFixed(3)),
    warmth: Number((evening * 0.16).toFixed(3)),
    // A broad reflection rather than a new sun or a claim about the camera's bearing.
    position: Number((50 + clamp(sun.hourAngle / 90, -1, 1) * 20).toFixed(1)),
  };
}
