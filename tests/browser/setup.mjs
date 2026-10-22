import { offlineMapPolicy } from '../../scripts/serve-site.mjs';

// This also protects TEST_BASE_URL and an already running development server:
// refuse a full automated run if its map can contact the billable service.
export default async function setup(config) {
  for (const baseURL of new Set(config.projects.map(project => project.use.baseURL))) {
    const response = await fetch(new URL('assets/store-map.html', baseURL));
    if (!response.ok || response.headers.get('content-security-policy') !== offlineMapPolicy) {
      throw new Error('Browser tests require the offline-map site server. Start scripts/serve-site.mjs without --live-map, or choose a free PLAYWRIGHT_PORT. Review the live vendor map separately.');
    }
    await response.body?.cancel();
  }
}
