import React, { Suspense, useEffect, useState } from 'react';
const GlobeViz = React.lazy(() => import('./components/GlobeViz'));
import Hud from './components/Hud';
import DetailPanel from './components/DetailPanel';
import { getCityCountAsync } from './services/dataService';
import { GeoPoint } from './types';

const App: React.FC = () => {
  // `data` state is no longer managed by App.tsx, but GlobeViz
  // const [data, setData] = useState<GeoPoint[]>([]); 
  const [globeLoading, setGlobeLoading] = useState(true); // New loading state for the GlobeViz
  const [totalNodeCount, setTotalNodeCount] = useState(0);
  
  // Selection State
  const [selectedPoints, setSelectedPoints] = useState<GeoPoint[] | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('');
  
  // Debounce state to prevent multiple rapid clicks
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    // Set total node count once when component mounts
    getCityCountAsync().then(setTotalNodeCount).catch(() => setTotalNodeCount(0));
  }, []);

  const handleHexClick = (points: GeoPoint[], lat: number, lng: number) => {
    // Prevent multiple rapid clicks
    if (isClicking) {
      return;
    }
    
    console.log(`[DEBUG] handleHexClick received ${points?.length || 0} points at (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    
    if (points && points.length > 0) {
      setIsClicking(true);
      const city = points[0].city || `Location ${lat.toFixed(1)}, ${lng.toFixed(1)}`;
      
      console.log(`[DEBUG] Selected city: ${city}, points:`, points.map(p => `${p.city}(${p.country}) at (${p.lat.toFixed(4)}, ${p.lng.toFixed(4)})`));
      
      setSelectedPoints(points);
      setSelectedCity(city);
      
      // Reset click state after a short delay
      setTimeout(() => setIsClicking(false), 300);
    } else {
      console.warn('No valid points provided to handleHexClick');
      setIsClicking(false);
    }
  };

  const closePanel = () => {
    setSelectedPoints(null);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#02040a] text-white">
      {/* 3D Visualization Layer */}
      <div className={`transition-opacity duration-1000 ${globeLoading ? 'opacity-0' : 'opacity-100'}`}>
        <Suspense fallback={null}>
          <GlobeViz 
            onHexClick={handleHexClick}
            setGlobeLoading={setGlobeLoading}
          />
        </Suspense>
      </div>

      {/* UI Overlay Layer */}
      <Hud totalNodes={totalNodeCount} loading={globeLoading} />

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
