export interface GeoPoint {
  lat: number;
  lng: number;
  weight: number; // Represents IP density/count
  city?: string;
  country?: string;
  ips: string[]; // List of CIDR blocks or IPs
}

export interface GlobeConfig {
  resolution: number;
  rotationSpeed: number;
  enableAtmosphere: boolean;
}