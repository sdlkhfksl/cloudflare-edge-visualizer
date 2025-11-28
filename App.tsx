import React, { useEffect, useState } from 'react';
import GlobeViz from './components/GlobeViz';
import Hud from './components/Hud';
import DetailPanel from './components/DetailPanel';
import { fetchEdgeLocations } from './services/dataService';
import { GeoPoint } from './types';

const App: React.FC = () => {
  const [data, setData] = useState<GeoPoint[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection State
  const [selectedPoints, setSelectedPoints] = useState<GeoPoint[] | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('');

  useEffect(() => {
    // Simulate the lifecycle of fetching Cloudflare CSV -> Parsing -> GeoIP Lookup
    const initData = async () => {
      try {
        const points = await fetchEdgeLocations();
        setData(points);
        setTimeout(() => setLoading(false), 500);
      } catch (error) {
        console.error("Failed to load edge data", error);
        setLoading(false);
      }
    };

    initData();
  }, []);

  const handleHexClick = (points: GeoPoint[], lat: number, lng: number) => {
    if (points && points.length > 0) {
      const city = points[0].city || `Location ${lat.toFixed(1)}, ${lng.toFixed(1)}`;
      setSelectedPoints(points);
      setSelectedCity(city);
    }
  };

  const closePanel = () => {
    setSelectedPoints(null);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#02040a] text-white">
      {/* 3D Visualization Layer */}
      <div className={`transition-opacity duration-1000 ${loading ? 'opacity-0' : 'opacity-100'}`}>
        <GlobeViz 
          data={data} 
          onHexClick={handleHexClick}
        />
      </div>

      {/* UI Overlay Layer */}
      <Hud totalNodes={data.length} loading={loading} />

      {/* Side Detail Panel */}
      {selectedPoints && (
        <DetailPanel 
          points={selectedPoints} 
          city={selectedCity} 
          onClose={closePanel} 
        />
      )}
      
      {/* Vignette Effect - Slightly reduced intensity for brightness */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]"></div>
    </main>
  );
};

export default App;