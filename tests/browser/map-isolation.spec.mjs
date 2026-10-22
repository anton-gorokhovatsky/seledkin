import { test, expect } from '@playwright/test';

test('automated page visits retain the map fallback without contacting Mapbox @contacts', async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  const completedVendorRequests = [];
  context.on('requestfinished', request => {
    if (new URL(request.url()).hostname.endsWith('mapbox.com')) completedVendorRequests.push(new URL(request.url()).pathname);
  });
  const page = await context.newPage();
  for (let visit = 0; visit < 2; visit++) {
    await page.goto(new URL('?audit=offline-map#contacts', baseURL).href);
    await page.locator('#store-map-frame').scrollIntoViewIfNeeded();
    const frame = page.frameLocator('#store-map-frame');
    await expect(frame.locator('html')).toHaveAttribute('data-map-state', 'unavailable');
    await expect(frame.getByRole('status')).toContainText('Карта недоступна');
    expect(await frame.locator('html').evaluate(() => typeof window.mapboxgl)).toBe('undefined');
    await expect(page.getByRole('link', { name: 'Открыть в Яндекс Картах', exact: true })).toHaveAttribute('href', 'https://yandex.ru/maps/org/1784904240/');
  }
  expect(completedVendorRequests).toEqual([]);
  await context.close();
});
