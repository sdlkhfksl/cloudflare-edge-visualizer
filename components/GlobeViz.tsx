import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';
// import { scaleLinear } from 'd3-scale';
import { GeoPoint } from '../types';
import { THEME } from '../constants';
import { fetchEdgeLocationsLazy, fetchLightweightMarkers, LightPoint } from '../services/dataService';

interface GlobeVizProps {
  onHexClick: (geoPoints: GeoPoint[], lat: number, lng: number) => void;
  setGlobeLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const GlobeViz: React.FC<GlobeVizProps> = ({ onHexClick, setGlobeLoading }) => {
  const controlsEndHandlerRef = useRef<(() => void) | null>(null);
  const initialLoadDoneRef = useRef(false);
  const globeEl = useRef<GlobeMethods | undefined>(undefined);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [mounted, setMounted] = useState(false);
  const [markers, setMarkers] = useState<LightPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewBounds, setViewBounds] = useState<{
    latMin: number;
    latMax: number;
    lngMin: number;
    lngMax: number;
  } | null>(null);
  
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Lightweight point markers (no pillars) and visible hemisphere filtering
  const [pointSize, setPointSize] = useState(0.08);
  const [povTick, setPovTick] = useState(0);

  const deg2rad = (deg: number) => (deg * Math.PI) / 180;
  const latLngToVec3 = (lat: number, lng: number) => {
    const phi = deg2rad(90 - lat);
    const theta = deg2rad(lng + 180);
    const x = -Math.sin(phi) * Math.cos(theta);
    const z = Math.sin(phi) * Math.sin(theta);
    const y = Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  };

  const visiblePoints = useMemo(() => {
    if (!globeEl.current) return markers.slice(0, 2000);
    const { lat: camLat, lng: camLng } = globeEl.current.pointOfView();
    const camVec = latLngToVec3(camLat, camLng);
    const filtered: LightPoint[] = [];
    for (const p of markers) {
      const v = latLngToVec3(p.lat, p.lng);
      if (camVec.dot(v) > 0) filtered.push(p); // Only front hemisphere
      if (filtered.length >= 3000) break; // Cap to keep it smooth
    }
    return filtered;
  }, [markers, povTick]);

  // Helper function to convert hex color to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => {
      return r + r + g + g + b + b;
    });

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`
      : 'rgba(255, 255, 255, 0.5)'; // Fallback color
  };

  // Load lightweight markers once (no IP data)
  const loadMarkers = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    if (!initialLoadDoneRef.current) setGlobeLoading(true);
    try {
      const light = await fetchLightweightMarkers();
      setMarkers(light);
    } catch (error) {
      console.error('Error loading markers:', error);
    } finally {
      setIsLoading(false);
      if (!initialLoadDoneRef.current) {
        setGlobeLoading(false);
        initialLoadDoneRef.current = true;
      }
    }
  }, [isLoading, setGlobeLoading]); // Added setGlobeLoading to dependencies

  const calculateViewBounds = useCallback(() => {
    if (!globeEl.current) return null;
    const { lat, lng, altitude } = globeEl.current.pointOfView();
    // Simplified bound calculation for initial broad view or when altitude is very high
    const viewAngle = altitude > 1.5 ? 90 : 45; // Wider angle for higher altitudes
    const latRange = (viewAngle / altitude) * 2;
    const lngRange = (viewAngle / altitude) * 2;
    return {
      latMin: Math.max(-90, lat - latRange),
      latMax: Math.min(90, lat + latRange),
      lngMin: lng - lngRange,
      lngMax: lng + lngRange
    };
  }, []);

  const handleCameraMove = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setPovTick(t => t + 1);
    }, 300);
  }, []);

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    setMounted(true);

    // Initial data load when component mounts
    loadMarkers(); 

    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty dependency array for componentDidMount-like behavior

  // This effect now ONLY sets up the globe controls and event listeners
  useEffect(() => {
    if (mounted && globeEl.current) {
      const controls = globeEl.current.controls();
      controls.autoRotate = false; // stop auto rotation by default for easy clicking
      controls.autoRotateSpeed = 0.4;
      controls.enableZoom = true;
      
     const onControlsEnd = () => {
       handleCameraMove();
       // tick to recompute visible hemisphere
       setPovTick(t => t + 1);
     };
      controlsEndHandlerRef.current = onControlsEnd;
      controls.addEventListener('end', onControlsEnd);

      const scene = globeEl.current.scene();
      if (!scene.getObjectByName("customLights")) {
        const lightGroup = new THREE.Group();
        lightGroup.name = "customLights";
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        lightGroup.add(ambientLight);
        const sunLight = new THREE.DirectionalLight(0xffffff, 3.0);
        sunLight.position.set(20, 20, 20);
        lightGroup.add(sunLight);
        scene.add(lightGroup);
      }
       return () => {
        if (globeEl.current) {
            const controls = globeEl.current.controls();
            if (controls && controlsEndHandlerRef.current) {
              controls.removeEventListener('end', controlsEndHandlerRef.current);
              controlsEndHandlerRef.current = null;
            }
        }
      }
    }
  }, [mounted, handleCameraMove]); // Removed 'data' from dependencies

  if (!mounted) return null;

  // Keep Globe mounted always; show a lightweight loading overlay instead
  const loadingOverlay = isLoading ? (
    <div style={{
      position: 'absolute',
      top: 16,
      left: 16,
      padding: '6px 10px',
      background: 'rgba(0,0,0,0.5)',
      border: '1px solid rgba(0,242,255,0.4)',
      borderRadius: 6,
      color: THEME.hexColorLow,
      fontFamily: 'monospace',
      fontSize: 12,
      zIndex: 5
    }}>
      syncing…
    </div>
  ) : null;

  return (
    <>
      {loadingOverlay}
      <Globe
      rendererConfig={{ powerPreference: 'low-power', antialias: false, precision: 'mediump' }}
      ref={globeEl}
      width={dimensions.width}
      height={dimensions.height}
      backgroundColor={THEME.background}
      
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
      bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
      
      atmosphereColor={THEME.atmosphere}
      atmosphereAltitude={0.25}

      // Switch to simple points instead of hex pillars
      pointsData={visiblePoints}
      pointLat={(d: GeoPoint) => d.lat}
      pointLng={(d: GeoPoint) => d.lng}
      pointAltitude={0}
      pointColor={() => '#0066cc'}
      pointRadius={0.1}
      pointResolution={8}
      pointLabel={(d: GeoPoint) => `${d.city || ''}${d.country ? ' - ' + d.country : ''}`}

      onPointClick={async (p: LightPoint, event, { lat, lng }) => {
        console.log(`[DEBUG] 点击了点: ${p.city}，坐标: (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        console.log(`[DEBUG] 这个点的实际坐标: (${p.lat.toFixed(4)}, ${p.lng.toFixed(4)})`);
        
        if (globeEl.current) {
          globeEl.current.controls().autoRotate = false;
          globeEl.current.pointOfView({ lat, lng, altitude: 1.5 }, 800);
        }
        
        // 不使用坐标搜索，直接加载所有数据然后过滤
        console.log(`[DEBUG] 直接加载所有数据，然后过滤城市: ${p.city}`);
        const allDetail = await fetchEdgeLocationsLazy(); // 不传bounds参数获取所有数据
        
        console.log(`[DEBUG] 总共加载了 ${allDetail.length} 个城市的数据`);
        
        // 只保留点击的城市
        const filteredDetail = allDetail?.filter(d => d.city === p.city) || [];
        
        console.log(`[DEBUG] 过滤后找到 ${filteredDetail.length} 个匹配 ${p.city} 的数据:`);
        filteredDetail.forEach((d, i) => {
          console.log(`[DEBUG] ${i+1}. 城市: ${d.city}, 国家: ${d.country}, 坐标: (${d.lat}, ${d.lng}), IP数量: ${d.ips?.length || 0}`);
          if (d.ips && d.ips.length > 0) {
            console.log(`[DEBUG]    前3个IP: ${d.ips.slice(0, 3).join(', ')}`);
          }
        });
        
        if (filteredDetail.length > 0) {
          onHexClick(filteredDetail, lat, lng);
        } else {
          console.log(`[DEBUG] 没有找到 ${p.city} 的数据`);
          onHexClick([], lat, lng);
        }
      }}
    />
    </>
  );
};

export default React.memo(GlobeViz);