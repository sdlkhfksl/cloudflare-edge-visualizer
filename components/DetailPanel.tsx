import React, { useState } from 'react';
import { GeoPoint } from '../types';

interface DetailPanelProps {
  points: GeoPoint[];
  onClose: () => void;
  city: string;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ points, onClose, city }) => {
  const [copied, setCopied] = useState(false);

  // Flatten all IPs from all points in this cluster
  const allIps = points.flatMap(p => p.ips);
  const uniqueIps = Array.from(new Set(allIps));

  const handleCopy = () => {
    navigator.clipboard.writeText(uniqueIps.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-black/90 backdrop-blur-xl border-l border-white/10 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-900/20 to-transparent">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 className="text-2xl font-bold text-white mb-1">{city}</h2>
        <div className="text-teal-400 text-sm font-mono tracking-wider">
          {uniqueIps.length} RANGES DETECTED
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {uniqueIps.map((ip, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 rounded bg-white/5 border border-white/5 hover:border-teal-500/50 hover:bg-teal-900/10 transition-all group">
            <span className="font-mono text-gray-300 text-sm">{ip}</span>
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></div>
          </div>
        ))}
      </div>

      {/* Footer / Actions */}
      <div className="p-4 border-t border-white/10 bg-black/50">
        <button
          onClick={handleCopy}
          className={`w-full py-3 px-4 rounded font-bold uppercase tracking-wide transition-all duration-200 flex items-center justify-center gap-2 ${
            copied 
              ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]' 
              : 'bg-teal-600 hover:bg-teal-500 text-white shadow-[0_0_15px_rgba(20,184,166,0.4)]'
          }`}
        >
          {copied ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              COPIED!
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
              COPY IP LIST
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default DetailPanel;