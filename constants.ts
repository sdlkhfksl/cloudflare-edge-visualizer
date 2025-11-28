
export const THEME = {
  background: '#040d21', // Deep navy blue instead of pitch black to reduce eye strain
  globeBase: '#1c4e80', // Much lighter, visible blue for the ocean
  atmosphere: '#4db2ff', // Bright daylight blue glow
  // High visibility neon colors for data points
  hexColorLow: '#00f2ff', // Cyan
  hexColorMid: '#006aff', // Azure
  hexColorHigh: '#ffffff', // White hot for high density
};

// DATA SOURCE: Based on public Cloudflare Network Map locations (PoPs)
// Coordinates are approximate centers of these cities.
export const CLOUDFLARE_DATA_CENTERS = [
  // --- North America ---
  { city: "Ashburn, VA", lat: 39.0438, lng: -77.4874, region: "NA", code: "IAD" },
  { city: "San Jose, CA", lat: 37.3382, lng: -121.8863, region: "NA", code: "SJC" },
  { city: "New York, NY", lat: 40.7128, lng: -74.0060, region: "NA", code: "EWR" },
  { city: "Chicago, IL", lat: 41.8781, lng: -87.6298, region: "NA", code: "ORD" },
  { city: "Los Angeles, CA", lat: 34.0522, lng: -118.2437, region: "NA", code: "LAX" },
  { city: "Dallas, TX", lat: 32.7767, lng: -96.7970, region: "NA", code: "DFW" },
  { city: "Miami, FL", lat: 25.7617, lng: -80.1918, region: "NA", code: "MIA" },
  { city: "Seattle, WA", lat: 47.6062, lng: -122.3321, region: "NA", code: "SEA" },
  { city: "Atlanta, GA", lat: 33.7490, lng: -84.3880, region: "NA", code: "ATL" },
  { city: "Toronto, Canada", lat: 43.6510, lng: -79.3470, region: "NA", code: "YYZ" },
  { city: "Vancouver, Canada", lat: 49.2827, lng: -123.1207, region: "NA", code: "YVR" },
  { city: "Mexico City, Mexico", lat: 19.4326, lng: -99.1332, region: "NA", code: "MEX" },

  // --- Europe ---
  { city: "London, UK", lat: 51.5074, lng: -0.1278, region: "EU", code: "LHR" },
  { city: "Frankfurt, Germany", lat: 50.1109, lng: 8.6821, region: "EU", code: "FRA" },
  { city: "Amsterdam, Netherlands", lat: 52.3676, lng: 4.9041, region: "EU", code: "AMS" },
  { city: "Paris, France", lat: 48.8566, lng: 2.3522, region: "EU", code: "CDG" },
  { city: "Madrid, Spain", lat: 40.4168, lng: -3.7038, region: "EU", code: "MAD" },
  { city: "Stockholm, Sweden", lat: 59.3293, lng: 18.0686, region: "EU", code: "ARN" },
  { city: "Warsaw, Poland", lat: 52.2297, lng: 21.0122, region: "EU", code: "WAW" },
  { city: "Prague, Czechia", lat: 50.0755, lng: 14.4378, region: "EU", code: "PRG" },
  { city: "Milan, Italy", lat: 45.4642, lng: 9.1900, region: "EU", code: "MXP" },
  { city: "Vienna, Austria", lat: 48.2082, lng: 16.3738, region: "EU", code: "VIE" },
  { city: "Zurich, Switzerland", lat: 47.3769, lng: 8.5417, region: "EU", code: "ZRH" },

  // --- Asia Pacific ---
  { city: "Singapore", lat: 1.3521, lng: 103.8198, region: "AS", code: "SIN" },
  { city: "Tokyo, Japan", lat: 35.6762, lng: 139.6503, region: "AS", code: "NRT" },
  { city: "Osaka, Japan", lat: 34.6937, lng: 135.5023, region: "AS", code: "KIX" },
  { city: "Hong Kong", lat: 22.3193, lng: 114.1694, region: "AS", code: "HKG" },
  { city: "Seoul, South Korea", lat: 37.5665, lng: 126.9780, region: "AS", code: "ICN" },
  { city: "Taipei, Taiwan", lat: 25.0330, lng: 121.5654, region: "AS", code: "TPE" },
  { city: "Sydney, Australia", lat: -33.8688, lng: 151.2093, region: "OC", code: "SYD" },
  { city: "Melbourne, Australia", lat: -37.8136, lng: 144.9631, region: "OC", code: "MEL" },
  { city: "Auckland, New Zealand", lat: -36.8485, lng: 174.7633, region: "OC", code: "AKL" },
  { city: "Mumbai, India", lat: 19.0760, lng: 72.8777, region: "AS", code: "BOM" },
  { city: "New Delhi, India", lat: 28.6139, lng: 77.2090, region: "AS", code: "DEL" },
  { city: "Bangalore, India", lat: 12.9716, lng: 77.5946, region: "AS", code: "BLR" },

  // --- South America ---
  { city: "São Paulo, Brazil", lat: -23.5505, lng: -46.6333, region: "SA", code: "GRU" },
  { city: "Rio de Janeiro, Brazil", lat: -22.9068, lng: -43.1729, region: "SA", code: "GIG" },
  { city: "Buenos Aires, Argentina", lat: -34.6037, lng: -58.3816, region: "SA", code: "EZE" },
  { city: "Santiago, Chile", lat: -33.4489, lng: -70.6693, region: "SA", code: "SCL" },
  { city: "Bogotá, Colombia", lat: 4.7110, lng: -74.0721, region: "SA", code: "BOG" },

  // --- MEA ---
  { city: "Dubai, UAE", lat: 25.2048, lng: 55.2708, region: "ME", code: "DXB" },
  { city: "Johannesburg, South Africa", lat: -26.2041, lng: 28.0473, region: "AF", code: "JNB" },
  { city: "Tel Aviv, Israel", lat: 32.0853, lng: 34.7818, region: "ME", code: "TLV" },
];

// Real Cloudflare IP prefixes (publicly known) to generate realistic looking data
export const CF_PREFIXES = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/12",
  "172.64.0.0/13",
  "131.0.72.0/22"
];
