/**
 * Geocoding utility using Nominatim API (OpenStreetMap)
 * Includes caching to avoid excessive API calls
 */

type GeocodingResult = {
  latitude: number;
  longitude: number;
  displayName: string;
};

type CacheEntry = {
  result: GeocodingResult;
  timestamp: number;
};

// In-memory cache (consider using localStorage for persistence)
const geocodeCache = new Map<string, CacheEntry>();

// Cache duration: 7 days
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

// Rate limiting: minimum delay between API calls
let lastApiCall = 0;
const MIN_API_DELAY = 1000; // 1 second between calls

/**
 * Geocode a location name to coordinates using Nominatim API
 * @param locationName - The location name to geocode
 * @param countryCode - Optional country code to improve accuracy (e.g., 'vn' for Vietnam)
 * @returns Promise with latitude, longitude, and display name
 */
export const geocodeLocation = async (
  locationName: string,
  countryCode?: string,
): Promise<GeocodingResult | null> => {
  if (!locationName || locationName.trim() === '') {
    return null;
  }

  const cacheKey = `${locationName.toLowerCase()}_${countryCode || ''}`;

  // Check cache first
  const cached = geocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.result;
  }

  // Rate limiting
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;
  if (timeSinceLastCall < MIN_API_DELAY) {
    await new Promise((resolve) => setTimeout(resolve, MIN_API_DELAY - timeSinceLastCall));
  }

  try {
    lastApiCall = Date.now();

    const params = new URLSearchParams({
      q: locationName,
      format: 'json',
      limit: '1',
      addressdetails: '1',
    });

    if (countryCode) {
      params.append('countrycodes', countryCode);
    }

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        'User-Agent': 'TravelAI-App/1.0',
      },
    });

    if (!response.ok) {
      console.error(`Geocoding API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      console.warn(`No geocoding results for: ${locationName}`);
      return null;
    }

    const result: GeocodingResult = {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };

    // Cache the result
    geocodeCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
    });

    return result;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

/**
 * Batch geocode multiple locations with rate limiting
 * @param locations - Array of location names
 * @param countryCode - Optional country code
 * @returns Promise with array of results (null for failed geocoding)
 */
export const batchGeocodeLocations = async (
  locations: string[],
  countryCode?: string,
): Promise<(GeocodingResult | null)[]> => {
  const results: (GeocodingResult | null)[] = [];

  for (const location of locations) {
    const result = await geocodeLocation(location, countryCode);
    results.push(result);
  }

  return results;
};

/**
 * Clear the geocoding cache
 */
export const clearGeocodeCache = () => {
  geocodeCache.clear();
};

/**
 * Get cache statistics
 */
export const getGeocodeStats = () => {
  return {
    cacheSize: geocodeCache.size,
    entries: Array.from(geocodeCache.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      result: entry.result,
    })),
  };
};
