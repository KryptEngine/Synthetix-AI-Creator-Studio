/**
 * Scene image generation.
 *
 * Primary source is Pollinations AI, which serves images from a free tier with
 * no key required. When the network is unavailable the local bundled assets
 * are used so the editor always has something to render.
 */

export const FALLBACK_ASSETS = [
  '/assets/cyber_city_scene_1792602671674.jpg',
  '/assets/android_ai_scene_1792602672297.jpg',
  '/assets/finance_shorts_scene_1792602672698.jpg',
  '/assets/avatar_alex_reed_1792602672415.jpg'
];

const POLLINATIONS_ENDPOINT = 'https://image.pollinations.ai/prompt/{prompt}';
const IMAGE_TIMEOUT_MS = 12_000;

function pollinationsUrl(prompt: string, seed: number): string {
  const endpoint = POLLINATIONS_ENDPOINT.replace(
    '{prompt}',
    encodeURIComponent(`${prompt} ${seed}`)
  );
  const url = new URL(endpoint);
  url.searchParams.set('width', '1024');
  url.searchParams.set('height', '576');
  url.searchParams.set('nologo', 'true');
  url.searchParams.set('seed', String(seed));
  url.searchParams.set('model', 'flux');
  return url.toString();
}

export interface ImageResult {
  url: string;
  provider: string;
  degraded: boolean;
}

async function tryPollinations(prompt: string, seed: number): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  try {
    const response = await fetch(pollinationsUrl(prompt, seed), {
      method: 'GET',
      signal: controller.signal
    });
    if (!response.ok) return null;
    const type = response.headers.get('content-type') || '';
    if (!type.startsWith('image/')) return null;
    return pollinationsUrl(prompt, seed);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Generates one image per scene in parallel, degrading to bundled assets when
 * a provider is unreachable.
 */
export async function generateSceneImages(
  prompts: string[]
): Promise<ImageResult[]> {
  const results = await Promise.all(
    prompts.map(async (prompt, index) => {
      const seed = Math.floor(Math.random() * 100000);
      const url = await tryPollinations(prompt, seed);
      if (url) {
        return { url, provider: 'Pollinations AI', degraded: false };
      }
      return {
        url: FALLBACK_ASSETS[index % FALLBACK_ASSETS.length],
        provider: 'Local Asset Library',
        degraded: true
      };
    })
  );
  return results;
}
