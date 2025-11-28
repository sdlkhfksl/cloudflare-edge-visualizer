import React from 'react';
import { GeoPoint } from '../types';

interface HudProps {
  totalNodes: number;
  loading: boolean;
}

const Hud: React.FC<HudProps> = ({ totalNodes, loading }) => {
  return (
    <>
      {/* Top Left: Title */}
      <div className="absolute top-6 left-6 z-10 pointer-events-none select-none">
        <h1 className="text-3xl font-bold tracking-tighter text-white uppercase drop-shadow-[0_0_10px_rgba(79,209,197,0.5)]">
          Cloudflare <span className="text-teal-400">Edge</span> Network
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <div className="h-[2px] w-12 bg-teal-500"></div>
          <span className="text-xs text-teal-300 tracking-widest uppercase">Global IP Distribution</span>
        </div>
      </div>

      {/* Bottom Right: Status */}
      <div className="absolute bottom-6 right-6 z-10 pointer-events-none select-none text-right">
        <div className="bg-black/80 backdrop-blur-md border border-teal-500/30 p-4 rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-end gap-3 mb-2">
            <span className="text-xs font-mono text-gray-400">STATUS</span>
            {loading ? (
               <span className="flex items-center text-yellow-400 text-sm font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-yellow-400 mr-2"></span>
                SYNCING CSV...
              </span>
            ) : (
              <span className="flex items-center text-emerald-400 text-sm font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-ping opacity-75 absolute"></span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 relative"></span>
                LIVE DATA
              </span>
            )}
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-end items-baseline gap-2">
              <span className="text-4xl font-mono font-bold text-white">
                {totalNodes.toLocaleString()}
              </span>
              <span className="text-xs text-teal-500 uppercase">Nodes</span>
            </div>
            <div className="text-[10px] text-gray-500 font-mono tracking-tight">
              SOURCE: api.cloudflare.com/local-ip-ranges.csv
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 pointer-events-none transition-opacity duration-1000">
           <div className="text-center">
             <div className="w-16 h-16 border-4 border-teal-900 border-t-teal-400 rounded-full animate-spin mb-4 mx-auto"></div>
             <div className="text-teal-400 font-mono text-sm tracking-widest animate-pulse">INITIALIZING WEBGL...</div>
           </div>
        </div>
      )}
    </>
  );
};

export default Hud;