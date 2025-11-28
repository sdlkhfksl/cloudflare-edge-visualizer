
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';
import { scaleLinear } from 'd3-scale';
import { GeoPoint } from '../types';
import { THEME } from '../constants';
import { fetchEdgeLocationsLazy } from '../services/dataService';

interface GlobeVizProps {
  data: GeoPoint[];
  onHexClick: (geoPoints: GeoPoint[], lat: number, lng: number) => void;
}

const GlobeViz: React.FC<GlobeVizProps> = ({ data, onHexClick }) => {
  const globeEl = useRef<GlobeMethods | undefined>(undefined);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [mounted, setMounted] = useState(false);
  const [globeData, setGlobeData] = useState<GeoPoint[]>(data);
  const [isLoading, setIsLoading] = useState(false);
  const [viewBounds, setViewBounds] = useState<{
    latMin: number;
    latMax: number;
    lngMin: number;
    lngMax: number;
  } | null>(null);
  
  // 防抖函数，避免频繁加载
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // 懒加载函数
  const loadViewData = useCallback(async (bounds: {
    latMin: number;
    latMax: number;
    lngMin: number;
    lngMax: number;
  }) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      console.log('Loading data for bounds:', bounds);
      const newData = await fetchEdgeLocationsLazy(bounds);
      setGlobeData(newData);
      setViewBounds(bounds);
    } catch (error) {
      console.error('Error loading view data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // 计算当前视图边界
  const calculateViewBounds = useCallback(() => {
    if (!globeEl.current) return null;
    
    const pointOfView = globeEl.current.pointOfView();
    const { lat, lng, altitude } = pointOfView;
    
    // 根据高度计算视野范围
    const viewAngle = 45; // 视野角度（度）
    const latRange = (viewAngle / altitude) * 2;
    const lngRange = (viewAngle / altitude) * 2;
    
    return {
      latMin: Math.max(-90, lat - latRange),
      latMax: Math.min(90, lat + latRange),
      lngMin: lng - lngRange,
      lngMax: lng + lngRange
    };
  }, []);

  // 处理相机移动事件
  const handleCameraMove = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      const bounds = calculateViewBounds();
      if (bounds && (!viewBounds || 
          Math.abs(bounds.latMin - viewBounds.latMin) > 5 ||
          Math.abs(bounds.latMax - viewBounds.latMax) > 5 ||
          Math.abs(bounds.lngMin - viewBounds.lngMin) > 5 ||
          Math.abs(bounds.lngMax - viewBounds.lngMax) > 5)) {
        loadViewData(bounds);
      }
    }, 500); // 500ms防抖
  }, [calculateViewBounds, loadViewData, viewBounds]);

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    setMounted(true);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // 初始化数据
  useEffect(() => {
    if (mounted && data.length > 0) {
      setGlobeData(data);
    }
  }, [mounted, data]);

  // Use a linear scale to interpolate between our theme colors based on density
  const colorScale = useMemo(() => {
    return scaleLinear<string>()
      .domain([0, 60, 140]) // Map weight range to colors
      .range([THEME.hexColorLow, THEME.hexColorMid, THEME.hexColorHigh])
      .clamp(true);
  }, []);

  useEffect(() => {
    if (globeEl.current) {
      const controls = globeEl.current.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.8;
      controls.enableZoom = true;
      
      const scene = globeEl.current.scene();
      
      // 1. Ambient Light - High Intensity
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
      scene.add(ambientLight);

      // 2. Main Sun Light - Bright White
      const sunLight = new THREE.DirectionalLight(0xffffff, 3.0);
      sunLight.position.set(20, 20, 20);
      scene.add(sunLight);
      
      // 3. Backlight (Rim Light)
      const rimLight = new THREE.DirectionalLight(0x4db2ff, 1.0);
      rimLight.position.set(-10, 10, -20);
      scene.add(rimLight);
    }
  }, [mounted]);

  if (!mounted) return null;

  // 显示加载状态
  if (isLoading) {
    return (
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        color: THEME.hexColorLow,
        fontSize: '18px',
        fontFamily: 'monospace',
        textAlign: 'center'
      }}>
        <div>LOADING EDGE DATA...</div>
        <div style={{ fontSize: '12px', marginTop: '10px', opacity: 0.7 }}>
          {viewBounds ? `Updating view for ${viewBounds.latMin.toFixed(1)}° to ${viewBounds.latMax.toFixed(1)}°` : 'Initializing...'}
        </div>
      </div>
    );
  }

  return (
    <Globe
      ref={globeEl}
      width={dimensions.width}
      height={dimensions.height}
      backgroundColor={THEME.background}
      
      // Textures
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
      bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
      
      // Atmosphere
      atmosphereColor={THEME.atmosphere}
      atmosphereAltitude={0.25}

      // Data Layer - 使用懒加载的数据
      hexBinPointsData={globeData}
      hexBinPointWeight="weight"
      hexBinResolution={3} 
      hexMargin={0.2}
      
      // Visuals
      hexBinAltitude={d => Math.min(d.sumWeight * 0.005, 0.5)}
      hexSideColor={() => 'rgba(0, 242, 255, 0.4)'}
      hexTopColor={d => colorScale(d.sumWeight)}
      
      // Interaction
      onHexClick={(hex, event, coords) => {
        if (globeEl.current) {
           globeEl.current.controls().autoRotate = false;
           globeEl.current.pointOfView({ lat: coords.lat, lng: coords.lng, altitude: 1.8 }, 1200);
        }
        onHexClick(hex.points as GeoPoint[], coords.lat, coords.lng);
      }}

      // Tooltip
      hexLabel={d => {
        const point = d.points[0] as GeoPoint;
        return `
        <div style="
          background: rgba(4, 13, 33, 0.95); 
          color: white; 
          padding: 12px; 
          border: 1px solid #00f2ff;
          border-radius: 8px;
          font-family: monospace;
          box-shadow: 0 0 20px rgba(0, 242, 255, 0.3);
          min-width: 180px;
        ">
          <div style="color: #00f2ff; font-weight: bold; font-size: 1.2em; margin-bottom: 6px; text-transform: uppercase;">
            ${point.city}
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.9em; color: #a5b4fc;">
             <span>REGION:</span>
             <span style="color: white;">${point.country || 'GLOBAL'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.9em; color: #a5b4fc;">
             <span>LOAD:</span>
             <span style="color: white;">${Math.round(d.sumWeight)}</span>
          </div>
          <div style="font-size: 0.75em; color: #64748b; margin-top: 8px; border-top: 1px solid #1e293b; padding-top: 6px; text-align: center;">
             CLICK TO INSPECT ROUTES
          </div>
        </div>
      `}}
    />
  );
};

export default React.memo(GlobeViz);
