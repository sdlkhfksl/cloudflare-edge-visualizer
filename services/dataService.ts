import { GeoPoint } from '../types';
export type LightPoint = { lat: number; lng: number; city?: string; country?: string };
// Lazy load city coordinates to keep initial bundle small
let cityCoordinatesCache: { [key: string]: { lat: number; lng: number; country: string } } | null = null;
const loadCityCoordinates = async () => {
  if (cityCoordinatesCache) return cityCoordinatesCache;
  const mod = await import('../public/city_coordinates');
  // When bundled, this splits into a separate chunk. In dev, it loads on demand.
  cityCoordinatesCache = (mod as any).cityCoordinates as typeof cityCoordinatesCache;
  return cityCoordinatesCache!;
};
import { CLOUDFLARE_DATA_CENTERS } from '../constants';

// Data caching and incremental update related
// Removed localStorage caching as it caused QuotaExceededError and is not essential for lazy loading
let lastCSVHash: string = '';
let cachedIPRanges: Array<{ cidr: string; city?: string; hash:string; }> = [];

/**
 * Calculates a simple hash of a string for quick content comparison.
 */
const calculateHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
};

/**
 * Parses the Cloudflare IP ranges CSV text.
 * Expected CSV structure (no header): CIDR,CountryCode,RegionCode,City
 */
const parseCloudflareCSV = (csvText: string): { cidr: string; city?: string; countryCode?: string }[] => {
  const lines = csvText.trim().split('\n');
  const result: { cidr: string; city?: string; countryCode?: string }[] = [];
  
  for (const line of lines) {
    if (!line) continue;
    
    // This is a simplified CSV parser assuming no commas within fields.
    const parts = line.split(',');
    
    const cidr = parts[0]?.trim();
    const countryCode = parts[1]?.trim(); // Extract country code
    // City is the 4th column (index 3) based on our previous CSV inspection
    const city = parts[3]?.trim();
    
    if (cidr && city) {
      result.push({ cidr, city, countryCode });
    }
  }
  
  // console.log(`Parsed ${result.length} IP ranges from CSV.`); // Removed debug log
  return result;
};


/**
 * Checks if the cached data is older than one day.
 */
const shouldUpdateData = (cachedTimestamp: number): boolean => {
  const now = new Date();
  const cachedDate = new Date(cachedTimestamp);
  
  const utcNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const utcCached = Date.UTC(cachedDate.getUTCFullYear(), cachedDate.getUTCMonth(), cachedDate.getUTCDate());
  
  const daysDiff = Math.floor((utcNow - utcCached) / (1000 * 60 * 60 * 24));
  
  // console.log(`Days since last update: ${daysDiff}`); // Removed debug log
  return daysDiff >= 1;
};

/**
 * Fetches Cloudflare IP ranges, using local cache if available and recent.
 */
const fetchCloudflareIPRanges = async (): Promise<{ cidr: string; city?: string; countryCode?: string }[]> => {
  // console.log('Starting fetchCloudflareIPRanges'); // Removed debug log
  // Removed localStorage caching logic to avoid QuotaExceededError
  
  try {
    // console.log('Fetching fresh data from local CSV file...'); // Removed debug log
    // Try local first to avoid CORS noise; fall back to remote only if needed
    let csvResponse: Response | null = null;
    try {
      const local = await fetch('/local-ip-ranges.csv');
      if (local.ok) {
        csvResponse = local;
      }
    } catch {}
    if (!csvResponse) {
      const remoteUrl = 'https://api.cloudflare.com/local-ip-ranges.csv';
      try {
        csvResponse = await fetch(remoteUrl, { cache: 'no-store' });
      } catch (e) {
        // Remote failed due to CORS or network; surface as empty
        console.warn('Remote CSV not available due to CORS or network, continuing without remote.');
      }
    }
    if (!csvResponse) {
      return [];
    }
    
    if (!csvResponse.ok) {
      throw new Error(`Failed to fetch CSV: ${csvResponse.status}`);
    }
    
    const csvText = await csvResponse.text();
    // const currentHash = calculateHash(csvText); // No longer needed without caching
    
    const newRanges = parseCloudflareCSV(csvText);
    
    return newRanges;
  } catch (error) {
    console.error('Failed to fetch Cloudflare CSV data:', error);
    return [];
  }
};

// Lightweight markers from city coordinates (no IP data)
export const fetchLightweightMarkers = async (): Promise<LightPoint[]> => {
  const cityMap = await loadCityCoordinates();
  const points: LightPoint[] = [];
  for (const [city, v] of Object.entries(cityMap)) {
    if (!v) continue;
    points.push({ lat: v.lat, lng: v.lng, city, country: v.country });
  }
  return points;
};

// Lazy loading cache for GeoPoints
let lazyLoadCache = new Map<string, GeoPoint[]>();
let loadingPromises = new Map<string, Promise<GeoPoint[]>>();

/**
 * Lazily loads GeoPoint data for the specified map bounds.
 */
export const fetchEdgeLocationsLazy = async (bounds?: {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}): Promise<GeoPoint[]> => {
  // console.log('fetchEdgeLocationsLazy called with bounds:', bounds); // Removed debug log
  const cacheKey = bounds ? `${bounds.latMin.toFixed(2)}-${bounds.lngMin.toFixed(2)}` : 'global';
  
  if (lazyLoadCache.has(cacheKey)) {
    // console.log(`Returning cached data for key: ${cacheKey}`); // Removed debug log
    return lazyLoadCache.get(cacheKey)!;
  }
  
  if (loadingPromises.has(cacheKey)) {
    // console.log(`Request already in progress for key: ${cacheKey}`); // Removed debug log
    return loadingPromises.get(cacheKey)!;
  }
  
  const loadingPromise = loadEdgeLocationsData(bounds);
  loadingPromises.set(cacheKey, loadingPromise);
  
  try {
    const data = await loadingPromise;
    lazyLoadCache.set(cacheKey, data);
    return data;
  } finally {
    loadingPromises.delete(cacheKey);
  }
};

/**
 * Main data loading and processing logic.
 * Fetches IP ranges, looks up coordinates, and aggregates them.
 */
const loadEdgeLocationsData = async (bounds?: {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}): Promise<GeoPoint[]> => {
  console.log('Starting loadEdgeLocationsData with bounds:', bounds); // Added debug log
  let processedCount = 0; // Added counter
  let skippedByBounds = 0; // Added counter
  let skippedByNoCoords = 0; // Added counter

  try {
    const ipRanges = await fetchCloudflareIPRanges();
    console.log(`Fetched ${ipRanges.length} IP ranges.`); // Added debug log
    
    // Create a temporary map for country code to full country name lookup if needed.
    // For now, let's keep `cityCoordinates` as is and see how many fall through.
    
    const ipLocationMap = new Map<string, {
      city: string; 
      lat: number; 
      lng: number; 
      country: string; // This will store the full country name from cityCoordinates
      sourceCountryCode: string; // Store the 2-letter code from CSV for comparison
      count: number; 
      ips: string[]; 
    }>();

    // Process IP ranges and aggregate by city
    for (const rangeData of ipRanges) {
      if (rangeData.city) {
        const cityMap = await loadCityCoordinates();
        const coords = cityMap[rangeData.city];
        
        if (coords) {
          processedCount++; // Increment for each IP range that has coords
          
          // 调试信息：记录处理的城市
          if (rangeData.city === 'Dandong' || rangeData.city === 'Seoul') {
            console.log(`[DEBUG] Processing ${rangeData.city}: IP=${rangeData.cidr}, Country=${rangeData.countryCode}, Coords=(${coords.lat}, ${coords.lng})`);
          }
          
          // 验证国家代码一致性，确保IP范围的国家与坐标数据匹配
          const csvCountry = rangeData.countryCode || '';
          const coordsCountry = coords.country || '';
          
          // 由于cityCoordinates中没有country字段，这个检查暂时跳过
          // 如果有国家代码但不匹配，记录警告但仍处理数据
          // if (csvCountry && coordsCountry && csvCountry !== coordsCountry) {
          //   console.warn(`Country mismatch for ${rangeData.city}: CSV=${csvCountry}, Coords=${coordsCountry}`);
          // }

          // Optional: Filter by bounds if provided
          if (bounds && (
            coords.lat < bounds.latMin || 
            coords.lat > bounds.latMax || 
            coords.lng < bounds.lngMin || 
            coords.lng > bounds.lngMax
          )) {
            skippedByBounds++;
            continue; // Skip if outside bounds
          }

          // Use a composite key to reduce ambiguity if `cityCoordinates` had duplicates
          // For now, use city as key, as that's what cityCoordinates provides.
          const key = rangeData.city; // Use city name as key since country is not available in coords

          if (ipLocationMap.has(key)) {
            const existing = ipLocationMap.get(key)!;
            existing.count++;
            existing.ips.push(rangeData.cidr);
          } else {
            ipLocationMap.set(key, {
              city: rangeData.city,
              lat: coords.lat,
              lng: coords.lng,
              country: rangeData.countryCode || 'Unknown', // Use countryCode from CSV since coords.country is undefined
              sourceCountryCode: rangeData.countryCode || 'N/A', // Store source country code
              count: 1,
              ips: [rangeData.cidr]
            });
            
            // 调试信息：记录新添加的城市
            if (rangeData.city === 'Dandong' || rangeData.city === 'Seoul') {
              console.log(`[DEBUG] Added city to map: ${rangeData.city} at (${coords.lat}, ${coords.lng}) with country ${rangeData.countryCode}`);
            }
          }
        } else {
          // Debugging: Log cities for which coordinates are not found
          console.warn(`Coordinates not found for city: ${rangeData.city} (Country: ${rangeData.countryCode})`);
          skippedByNoCoords++;
        }
      }
    }
    console.log(`Processed ${processedCount} IP ranges with coordinates. Skipped ${skippedByBounds} by bounds, ${skippedByNoCoords} by no coords.`); // Added debug log

    // Convert aggregated data to GeoPoint format
    const points: GeoPoint[] = [];
    ipLocationMap.forEach((data) => {
      const weight = data.count * 15 + (Math.random() * 20 - 10);
      
      const geoPoint: GeoPoint = {
        lat: data.lat,
        lng: data.lng,
        weight: Math.max(20, weight), // Ensure minimum weight for visibility
        city: data.city,
        country: data.country,
        ips: data.ips
      };
      
      points.push(geoPoint);
    });
    
    console.log(`Aggregated ${ipLocationMap.size} unique city-country locations into ${points.length} GeoPoints.`); // Added debug log
    return points;
  } catch (error) {
    console.error('Error in loadEdgeLocationsData:', error);
    return []; // Return empty array on error
  }
};


/**
 * Returns the total number of cities available in the dataset.
 */
export const getCityCountAsync = async (): Promise<number> => {
  const cityMap = await loadCityCoordinates();
  return Object.keys(cityMap).length;
};

/**
 * Fetches only the core Cloudflare data centers for the initial, clean view.
 */
export const fetchCoreDataCenters = (): GeoPoint[] => {
  // console.log("Fetching core data centers for initial view..."); // Removed debug log
  const points: GeoPoint[] = CLOUDFLARE_DATA_CENTERS.map(center => ({
    lat: center.lat,
    lng: center.lng,
    weight: 60, // Assign a medium-high weight for good visibility
    city: center.city,
    country: center.region,
    ips: [center.code] // Use airport code as a placeholder
  }));
  // console.log(`Loaded ${points.length} core data centers.`); // Removed debug log
  return points;
};


// Original function for backward compatibility
export const fetchEdgeLocations = (): Promise<GeoPoint[]> => {
  // console.log('fetchEdgeLocations (legacy) called, redirecting to lazy loader without bounds.'); // Removed debug log
  return fetchEdgeLocationsLazy();
};