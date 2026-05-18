type GeocodingResult = {
  latitude: number;
  longitude: number;
  displayName: string;
};

// ── Persistent cache via localStorage ────────────────────────────────────────
const CACHE_KEY = 'travelai_geocache_v1';
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

type CacheStore = Record<string, { result: GeocodingResult; ts: number }>;

const loadCache = (): CacheStore => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}');
  } catch {
    return {};
  }
};

const saveCache = (store: CacheStore) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(store));
  } catch {
    // quota exceeded — ignore
  }
};

// In-memory mirror for fast reads
let memCache: CacheStore = loadCache();

const getCached = (key: string): GeocodingResult | null => {
  const entry = memCache[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    delete memCache[key];
    return null;
  }
  return entry.result;
};

const setCache = (key: string, result: GeocodingResult) => {
  memCache[key] = { result, ts: Date.now() };
  saveCache(memCache);
};

// ── Rate limiter ──────────────────────────────────────────────────────────────
// Nominatim policy: max 1 req/s. We use a simple queue.
let lastCall = 0;
const MIN_DELAY = 1050; // slightly over 1s to be safe

const rateLimit = async () => {
  const wait = MIN_DELAY - (Date.now() - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
};

// ── Core geocode function ─────────────────────────────────────────────────────

export const geocodeLocation = async (
  query: string,
  countryCode = 'vn',
): Promise<GeocodingResult | null> => {
  const q = query.trim();
  if (!q) return null;

  const key = `${q.toLowerCase()}|${countryCode}`;
  const cached = getCached(key);
  if (cached) return cached;

  await rateLimit();

  try {
    const params = new URLSearchParams({
      q,
      format: 'json',
      limit: '1',
      countrycodes: countryCode,
    });

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: { 'User-Agent': 'TravelAI/1.0 (travel-ai-ui)' } },
    );

    if (!res.ok) return null;

    const data: Array<{ lat: string; lon: string; display_name: string }> = await res.json();
    if (!data.length) return null;

    const result: GeocodingResult = {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };

    setCache(key, result);
    return result;
  } catch {
    return null;
  }
};

export const clearGeocodeCache = () => {
  memCache = {};
  try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
};
