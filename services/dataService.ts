
import { GeoPoint } from '../types';
import { CLOUDFLARE_DATA_CENTERS, CF_PREFIXES } from '../constants';

// GeoLite2-City.mmdb数据库缓存
let geoDbCache: any = null;
let geoDbReader: any = null;

// 数据缓存和增量更新相关
let lastCSVHash: string = '';
let cachedIPRanges: Array<{ cidr: string; city?: string; hash: string }> = [];
let isLoadingData = false;

/**
 * 初始化本地GeoLite2数据库
 */
const initGeoDb = async (): Promise<any> => {
  if (geoDbCache) return geoDbCache;
  
  try {
    // 从本地加载GeoLite2-City.mmdb数据库
    console.log('Loading local GeoLite2 database...');
    const response = await fetch('/GeoLite2-City.mmdb');
    
    if (!response.ok) {
      throw new Error(`Failed to load local GeoLite2 database: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // 在实际应用中，这里需要使用maxmind-db的WebAssembly版本
    // 由于浏览器限制，我们暂时缓存数据并实现简化版本
    geoDbCache = {
      data: uint8Array,
      initialized: true,
      loadedAt: Date.now()
    };
    
    console.log('Local GeoLite2 database loaded successfully');
    return geoDbCache;
  } catch (error) {
    console.warn('Failed to initialize GeoLite2 database:', error);
    // 回退到静态映射
    geoDbCache = { initialized: false };
    return geoDbCache;
  }
};

/**
 * 计算字符串哈希值用于增量更新检测
 */
const calculateHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  return hash.toString(36);
};

/**
 * 从CIDR获取一个代表性的IP地址
 */
const getRepresentativeIp = (cidr: string): string => {
  const [baseIp, prefixLength] = cidr.split('/');
  const parts = baseIp.split('.').map(Number);
  const prefix = parseInt(prefixLength);
  
  // 使用网络地址作为代表IP
  return baseIp;
};

/**
 * 使用GeoLite2数据库查询IP地理位置
 */
const queryGeoLite2 = async (ip: string): Promise<{ city: string; lat: number; lng: number; country?: string } | null> => {
  try {
    await initGeoDb();
    
    if (!geoDbCache?.initialized || !geoDbCache?.data) {
      // 如果数据库未初始化，回退到静态映射
      return getStaticGeoMapping(ip);
    }
    
    // 在实际应用中，这里应该使用maxmind-db的WebAssembly版本查询数据库
    // 由于浏览器环境限制，我们暂时使用静态映射作为示例
    console.log(`Querying GeoLite2 for IP: ${ip}`);
    
    // 实际实现应该是：
    // const result = await geoDbCache.reader.get(ip);
    // return {
    //   city: result.city?.names?.en || 'Unknown',
    //   lat: result.location?.latitude || 0,
    //   lng: result.location?.longitude || 0,
    //   country: result.country?.iso_code || 'Unknown'
    // };
    
    return getStaticGeoMapping(ip);
  } catch (error) {
    console.warn('Failed to query GeoLite2 for IP:', ip, error);
    return getStaticGeoMapping(ip);
  }
};

/**
 * 静态地理位置映射作为回退方案
 */
const getStaticGeoMapping = (ip: string): { city: string; lat: number; lng: number; country: string } | null => {
  const geoMapping: { [key: string]: { city: string; lat: number; lng: number; country: string } } = {
    '173.245.48.1': { city: 'Ashburn, VA', lat: 39.0438, lng: -77.4874, country: 'US' },
    '103.21.244.1': { city: 'San Jose, CA', lat: 37.3382, lng: -121.8863, country: 'US' },
    '103.22.200.1': { city: 'New York, NY', lat: 40.7128, lng: -74.0060, country: 'US' },
    '103.31.4.1': { city: 'Chicago, IL', lat: 41.8781, lng: -87.6298, country: 'US' },
    '141.101.64.1': { city: 'Los Angeles, CA', lat: 34.0522, lng: -118.2437, country: 'US' },
    '108.162.192.1': { city: 'Dallas, TX', lat: 32.7767, lng: -96.7970, country: 'US' },
    '190.93.240.1': { city: 'Miami, FL', lat: 25.7617, lng: -80.1918, country: 'US' },
    '188.114.96.1': { city: 'London, UK', lat: 51.5074, lng: -0.1278, country: 'GB' },
    '197.234.240.1': { city: 'Frankfurt, Germany', lat: 50.1109, lng: 8.6821, country: 'DE' },
    '198.41.128.1': { city: 'Amsterdam, Netherlands', lat: 52.3676, lng: 4.9041, country: 'NL' },
    '162.158.0.1': { city: 'Paris, France', lat: 48.8566, lng: 2.3522, country: 'FR' },
    '104.16.0.1': { city: 'Singapore', lat: 1.3521, lng: 103.8198, country: 'SG' },
    '172.64.0.1': { city: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503, country: 'JP' },
    '131.0.72.1': { city: 'Hong Kong', lat: 22.3193, lng: 114.1694, country: 'HK' },
  };
  
  return geoMapping[ip] || null;
};

/**
 * 获取IP范围的地理位置信息
 */
const getIpLocation = async (cidr: string): Promise<{ city: string; lat: number; lng: number; country?: string } | null> => {
  // 首先尝试使用GeoLite2数据库
  const representativeIp = getRepresentativeIp(cidr);
  const geoResult = await queryGeoLite2(representativeIp);
  
  if (geoResult) {
    return geoResult;
  }
  
  // 如果GeoLite2查询失败，根据IP前缀推断地理位置
  const [baseIp] = cidr.split('/');
  const firstOctet = parseInt(baseIp.split('.')[0]);
  
  // 基于IP前缀的粗略地理位置推断
  if (firstOctet >= 172 && firstOctet <= 173) {
    return { city: 'North America', lat: 39.8283, lng: -98.5795, country: 'US' };
  } else if (firstOctet >= 104 && firstOctet <= 108) {
    return { city: 'Global', lat: 0, lng: 0, country: 'GLOBAL' };
  } else if (firstOctet >= 188 && firstOctet <= 198) {
    return { city: 'Europe', lat: 50.0, lng: 10.0, country: 'EU' };
  } else if (firstOctet >= 131 && firstOctet <= 141) {
    return { city: 'Asia Pacific', lat: 25.0, lng: 120.0, country: 'APAC' };
  }
  
  return null;
};

/**
 * Generates realistic-looking IP subnets for a given location code.
 * Since we don't have the live CSV->GeoIP mapping in browser, 
 * we map real locations to valid Cloudflare subnets.
 */
const generateRealIps = (count: number, seed: number): string[] => {
  const ips: string[] = [];
  const usedPrefixes = new Set<number>();
  
  for (let i = 0; i < count; i++) {
    // Use a better distribution to avoid clustering
    const prefixIndex = Math.floor(((seed * 7 + i * 13) % CF_PREFIXES.length + CF_PREFIXES.length) % CF_PREFIXES.length);
    
    // Avoid using the same prefix multiple times for better distribution
    if (usedPrefixes.has(prefixIndex)) {
      continue;
    }
    usedPrefixes.add(prefixIndex);
    
    const baseCidr = CF_PREFIXES[prefixIndex];
    const [baseIp, prefixLength] = baseCidr.split('/');
    const parts = baseIp.split('.');
    
    // Calculate the actual network size based on prefix length
    const cidrNum = parseInt(prefixLength);
    const hostBits = 32 - cidrNum;
    
    if (cidrNum <= 24) {
      // For /24 or larger networks, generate /24 subnets
      const subnetSize = Math.pow(2, 24 - cidrNum);
      const subnetIndex = (seed + i) % subnetSize;
      
      // Calculate the third octet with proper bounds checking
      const baseThirdOctet = parseInt(parts[2]);
      const newThirdOctet = (baseThirdOctet + Math.floor(subnetIndex / 256)) % 256;
      
      ips.push(`${parts[0]}.${parts[1]}.${newThirdOctet}.0/24`);
    } else {
      // For /25 to /32 networks, keep them as is
      ips.push(baseCidr);
    }
  }
  
  // Remove duplicates and return
  return Array.from(new Set(ips));
};

/**
 * 检查是否需要更新数据（基于UTC时间戳，超过1天才更新）
 */
const shouldUpdateData = (cachedTimestamp: number): boolean => {
  const now = new Date();
  const cachedDate = new Date(cachedTimestamp);
  
  // 计算UTC天数差异
  const utcNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const utcCached = Date.UTC(cachedDate.getUTCFullYear(), cachedDate.getUTCMonth(), cachedDate.getUTCDate());
  
  const daysDiff = Math.floor((utcNow - utcCached) / (1000 * 60 * 60 * 24));
  
  console.log(`Days since last update: ${daysDiff}`);
  return daysDiff >= 1; // 超过1天才更新
};

/**
 * 增量更新Cloudflare IP范围数据（基于时间戳的智能更新）
 */
const fetchCloudflareIPRangesIncremental = async (): Promise<{ cidr: string; city?: string; hash: string }[]> => {
  // 首先尝试从localStorage加载缓存数据
  try {
    const cached = localStorage.getItem('cf_ip_ranges');
    if (cached) {
      const data = JSON.parse(cached);
      
      // 检查是否需要更新
      if (!shouldUpdateData(data.timestamp)) {
        console.log('Using cached data (less than 1 day old)');
        lastCSVHash = data.hash || '';
        cachedIPRanges = data.ranges || [];
        return cachedIPRanges;
      }
      
      console.log('Cached data is older than 1 day, checking for updates');
      lastCSVHash = data.hash || '';
      cachedIPRanges = data.ranges || [];
    }
  } catch (cacheError) {
    console.warn('Failed to load cached data:', cacheError);
  }
  
  try {
    // 获取CSV数据
    console.log('Fetching fresh data from Cloudflare API...');
    const csvResponse = await fetch('https://api.cloudflare.com/local-ip-ranges.csv');
    
    if (!csvResponse.ok) {
      throw new Error(`Failed to fetch CSV: ${csvResponse.status}`);
    }
    
    const csvText = await csvResponse.text();
    const currentHash = calculateHash(csvText);
    
    // 检查是否有实际更新
    if (lastCSVHash === currentHash && cachedIPRanges.length > 0) {
      console.log('No content changes detected, updating timestamp only');
      
      // 更新时间戳但保持数据不变
      try {
        localStorage.setItem('cf_ip_ranges', JSON.stringify({
          hash: currentHash,
          ranges: cachedIPRanges,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.warn('Failed to update timestamp in localStorage:', error);
      }
      
      return cachedIPRanges;
    }
    
    console.log('Content changes detected, processing new data');
    const newRanges = parseCloudflareCSVWithHash(csvText);
    
    // 执行增量更新
    const updatedRanges = performIncrementalUpdate(cachedIPRanges, newRanges);
    
    // 更新缓存和时间戳
    lastCSVHash = currentHash;
    cachedIPRanges = updatedRanges;
    
    // 保存到localStorage以实现持久化
    try {
      localStorage.setItem('cf_ip_ranges', JSON.stringify({
        hash: currentHash,
        ranges: updatedRanges,
        timestamp: Date.now()
      }));
      console.log('Data updated and cached successfully');
    } catch (error) {
      console.warn('Failed to cache data to localStorage:', error);
    }
    
    return updatedRanges;
  } catch (error) {
    console.warn('Failed to fetch Cloudflare CSV data:', error);
    
    // 如果有缓存数据，即使过期也使用它
    if (cachedIPRanges.length > 0) {
      console.log('Using existing cached data due to fetch failure');
      return cachedIPRanges;
    }
    
    // 回退到普通IP列表
    try {
      const response = await fetch('https://www.cloudflare.com/ips-v4');
      if (!response.ok) {
        throw new Error('Failed to fetch Cloudflare IP ranges');
      }
      const text = await response.text();
      const ipRanges = text.trim().split('\n').filter(line => line.trim());
      const fallbackRanges = ipRanges.map(cidr => ({ cidr, hash: calculateHash(cidr) }));
      
      // 缓存回退数据
      try {
        localStorage.setItem('cf_ip_ranges', JSON.stringify({
          hash: calculateHash('fallback'),
          ranges: fallbackRanges,
          timestamp: Date.now()
        }));
      } catch (cacheError) {
        console.warn('Failed to cache fallback data:', cacheError);
      }
      
      return fallbackRanges;
    } catch (fallbackError) {
      console.warn('Failed to fetch real Cloudflare IP ranges, using fallback:', fallbackError);
      const fallbackRanges = CF_PREFIXES.map(cidr => ({ cidr, hash: calculateHash(cidr) }));
      
      // 缓存静态回退数据
      try {
        localStorage.setItem('cf_ip_ranges', JSON.stringify({
          hash: calculateHash('static'),
          ranges: fallbackRanges,
          timestamp: Date.now()
        }));
      } catch (cacheError) {
        console.warn('Failed to cache static fallback data:', cacheError);
      }
      
      return fallbackRanges;
    }
  }
};

/**
 * 解析Cloudflare CSV数据并计算哈希
 */
const parseCloudflareCSVWithHash = (csvText: string): { cidr: string; city?: string; hash: string }[] => {
  const lines = csvText.trim().split('\n');
  const result: { cidr: string; city?: string; hash: string }[] = [];
  
  // 跳过标题行，解析数据行
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // 简单的CSV解析（假设格式为: cidr,city,country或其他格式）
    const parts = line.split(',');
    const cidr = parts[0]?.trim();
    const city = parts[1]?.trim();
    
    if (cidr) {
      const hash = calculateHash(`${cidr}-${city || ''}`);
      result.push({
        cidr,
        city: city && city !== '' ? city : undefined,
        hash
      });
    }
  }
  
  return result;
};

/**
 * 执行增量更新
 */
const performIncrementalUpdate = (
  oldRanges: { cidr: string; city?: string; hash: string }[],
  newRanges: { cidr: string; city?: string; hash: string }[]
): { cidr: string; city?: string; hash: string }[] => {
  const oldMap = new Map(oldRanges.map(r => [r.hash, r]));
  const newMap = new Map(newRanges.map(r => [r.hash, r]));
  
  // 识别新增、修改和删除的项目
  const added = newRanges.filter(r => !oldMap.has(r.hash));
  const removed = oldRanges.filter(r => !newMap.has(r.hash));
  const modified = newRanges.filter(r => {
    const old = oldMap.get(r.hash);
    return old && old.city !== r.city;
  });
  
  console.log(`Incremental update: ${added.length} added, ${removed.length} removed, ${modified.length} modified`);
  
  // 返回新的完整列表
  return newRanges;
};

// 懒加载缓存
let lazyLoadCache = new Map<string, GeoPoint[]>();
let loadingPromises = new Map<string, Promise<GeoPoint[]>>();

/**
 * 懒加载特定区域的数据
 */
export const fetchEdgeLocationsLazy = async (bounds?: {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}): Promise<GeoPoint[]> => {
  const cacheKey = bounds ? 
    `${bounds.latMin}-${bounds.latMax}-${bounds.lngMin}-${bounds.lngMax}` : 
    'global';
  
  // 检查缓存
  if (lazyLoadCache.has(cacheKey)) {
    console.log(`Using cached data for ${cacheKey}`);
    return lazyLoadCache.get(cacheKey)!;
  }
  
  // 检查是否正在加载
  if (loadingPromises.has(cacheKey)) {
    console.log(`Already loading data for ${cacheKey}`);
    return loadingPromises.get(cacheKey)!;
  }
  
  // 开始加载
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
 * 实际的数据加载逻辑
 */
const loadEdgeLocationsData = async (bounds?: {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}): Promise<GeoPoint[]> => {
  return new Promise(async (resolve) => {
    try {
      // 初始化GeoLite2数据库
      await initGeoDb();
      
      // 获取增量更新的IP范围数据
      const ipRanges = await fetchCloudflareIPRangesIncremental();
      
      // 如果有边界限制，只处理相关区域
      const relevantRanges = bounds ? 
        filterRangesByBounds(ipRanges, bounds) : 
        ipRanges;
      
      console.log(`Processing ${relevantRanges.length} IP ranges for bounds:`, bounds);
      
      const points: GeoPoint[] = [];
      const ipLocationMap = new Map<string, {
        city: string; 
        lat: number; 
        lng: number; 
        count: number; 
        ips: string[]; 
        country: string 
      }>();
      
      // 批量处理IP范围以提高性能
      const batchSize = 50; // 分批处理，避免阻塞UI
      for (let i = 0; i < relevantRanges.length; i += batchSize) {
        const batch = relevantRanges.slice(i, i + batchSize);
        
        // 处理每个IP范围
        for (const rangeData of batch) {
          let location: { city: string; lat: number; lng: number; country?: string } | null = null;
          
          // 如果CSV中已有城市信息，优先使用
          if (rangeData.city) {
            // 尝试匹配已知数据中心
            const knownCenter = CLOUDFLARE_DATA_CENTERS.find(center => 
              center.city.toLowerCase().includes(rangeData.city!.toLowerCase()) ||
              rangeData.city!.toLowerCase().includes(center.city.toLowerCase())
            );
            
            if (knownCenter) {
              location = {
                city: knownCenter.city,
                lat: knownCenter.lat,
                lng: knownCenter.lng,
                country: knownCenter.region
              };
            } else {
              // 对于CSV中的城市但不在已知列表中的，使用GeoLite2查询
              location = await getIpLocation(rangeData.cidr);
              if (location && rangeData.city) {
                location.city = rangeData.city; // 保留CSV中的城市名称
              }
            }
          }
          
          // 如果没有找到位置信息，使用GeoLite2查询
          if (!location) {
            location = await getIpLocation(rangeData.cidr);
          }
          
          if (location) {
            // 如果有边界限制，检查位置是否在边界内
            if (bounds && (
              location.lat < bounds.latMin || 
              location.lat > bounds.latMax || 
              location.lng < bounds.lngMin || 
              location.lng > bounds.lngMax
            )) {
              continue; // 跳过不在边界内的位置
            }
            
            const key = `${location.city}-${location.lat}-${location.lng}`;
            
            if (ipLocationMap.has(key)) {
              const existing = ipLocationMap.get(key)!;
              existing.count++;
              existing.ips.push(rangeData.cidr);
            } else {
              ipLocationMap.set(key, {
                city: location.city,
                lat: location.lat,
                lng: location.lng,
                country: location.country || getRegionFromCity(location.city),
                count: 1,
                ips: [rangeData.cidr]
              });
            }
          }
        }
        
        // 在批次之间让出控制权，避免阻塞UI
        if (i + batchSize < relevantRanges.length) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      // 转换为GeoPoint格式
      ipLocationMap.forEach((data) => {
        // 根据IP数量计算权重
        let weight = data.count * 15;
        
        // 主要城市获得额外权重
        const majorCities = ['Ashburn, VA', 'San Jose, CA', 'London, UK', 'Frankfurt, Germany', 'Singapore', 'Tokyo, Japan'];
        if (majorCities.includes(data.city)) {
          weight *= 1.5;
        }
        
        // 添加一些随机变化以模拟真实流量
        weight = weight + (Math.random() * 20 - 10);
        
        points.push({
          lat: data.lat,
          lng: data.lng,
          weight: Math.max(20, weight),
          city: data.city,
          country: data.country,
          ips: data.ips
        });
      });
      
      // 如果数据不足，补充已知数据中心
      if (points.length < CLOUDFLARE_DATA_CENTERS.length * 0.1) {
        const relevantCenters = bounds ? 
          CLOUDFLARE_DATA_CENTERS.filter(center => 
            center.lat >= bounds.latMin && 
            center.lat <= bounds.latMax && 
            center.lng >= bounds.lngMin && 
            center.lng <= bounds.lngMax
          ) : 
          CLOUDFLARE_DATA_CENTERS;
        
        relevantCenters.forEach((center, index) => {
          const existingPoint = points.find(p => 
            Math.abs(p.lat - center.lat) < 0.1 && Math.abs(p.lng - center.lng) < 0.1
          );
          
          if (!existingPoint) {
            let baseWeight = 30;
            const tier1Cities = ['Ashburn, VA', 'San Jose, CA', 'London, UK', 'Frankfurt, Germany', 'Singapore', 'Tokyo, Japan'];
            if (tier1Cities.includes(center.city)) {
              baseWeight = 100;
            } else if (['NA', 'EU', 'AS'].includes(center.region)) {
              baseWeight = 60;
            }
            
            const weight = baseWeight + (Math.random() * 30 - 15);
            const ipCount = Math.max(3, Math.floor(weight / 10));
            
            points.push({
              lat: center.lat,
              lng: center.lng,
              weight: weight,
              city: center.city,
              country: center.region,
              ips: generateRealIps(ipCount, index)
            });
          }
        });
      }
      
      console.log(`Loaded ${points.length} edge locations for bounds:`, bounds);
      resolve(points);
    } catch (error) {
      console.error('Error fetching edge locations:', error);
      
      // 回退到模拟数据
      const points: GeoPoint[] = [];
      const relevantCenters = bounds ? 
        CLOUDFLARE_DATA_CENTERS.filter(center => 
          center.lat >= bounds.latMin && 
          center.lat <= bounds.latMax && 
          center.lng >= bounds.lngMin && 
          center.lng <= bounds.lngMax
        ) : 
        CLOUDFLARE_DATA_CENTERS;
      
      relevantCenters.forEach((center, index) => {
        let baseWeight = 50;
        if (['NA', 'EU', 'AS'].includes(center.region)) baseWeight = 80;
        const weight = baseWeight + (Math.random() * 40);
        const ipCount = Math.floor(weight / 5) + 5;
        
        points.push({
          lat: center.lat,
          lng: center.lng,
          weight: weight,
          city: center.city,
          country: center.region,
          ips: generateRealIps(ipCount, index)
        });
      });
      
      resolve(points);
    }
  });
};

/**
 * 根据边界过滤IP范围
 */
const filterRangesByBounds = (
  ranges: Array<{ cidr: string; city?: string; hash: string }>,
  bounds: { latMin: number; latMax: number; lngMin: number; lngMax: number }
): Array<{ cidr: string; city?: string; hash: string }> => {
  // 如果有城市信息，先根据城市过滤
  const rangesWithCity = ranges.filter(r => r.city);
  const rangesWithoutCity = ranges.filter(r => !r.city);
  
  // 对于有城市信息的，尝试匹配已知数据中心
  const filteredWithCity = rangesWithCity.filter(range => {
    const knownCenter = CLOUDFLARE_DATA_CENTERS.find(center => 
      center.city.toLowerCase().includes(range.city!.toLowerCase()) ||
      range.city!.toLowerCase().includes(center.city.toLowerCase())
    );
    
    return knownCenter && 
      knownCenter.lat >= bounds.latMin && 
      knownCenter.lat <= bounds.latMax && 
      knownCenter.lng >= bounds.lngMin && 
      knownCenter.lng <= bounds.lngMax;
  });
  
  // 对于没有城市信息的，返回一部分（后续会通过GeoLite2查询过滤）
  const sampleSize = Math.min(100, rangesWithoutCity.length);
  const sampledWithoutCity = rangesWithoutCity
    .sort(() => Math.random() - 0.5)
    .slice(0, sampleSize);
  
  return [...filteredWithCity, ...sampledWithoutCity];
};

// 保持向后兼容的全量加载函数
export const fetchEdgeLocations = (): Promise<GeoPoint[]> => {
  return fetchEdgeLocationsLazy();
};
