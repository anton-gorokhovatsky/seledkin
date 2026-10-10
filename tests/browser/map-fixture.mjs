// Exercise the parent map interaction without billing Mapbox or relying on a GPU.
// The actual vendor map and both themes are verified in the release browser.
export async function stubStoreMap(page) {
  await page.route("**/assets/store-map.html*", route => route.fulfill({
    contentType: "text/html", body: `<!doctype html><html lang="ru"><title>Карта лавки</title><body>
      <button>Приблизить карту</button><script>
      addEventListener('keydown', event => { if(event.key === 'Escape') parent.postMessage({type:'seledkin:map-escape'},location.origin); });
      parent.postMessage({type:'seledkin:map-ready'},location.origin);
      </script></body></html>`,
  }));
}
