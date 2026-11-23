import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTelemetry } from '../../context/TelemetryContext';

interface OpenStreetMapTrackerProps {
  className?: string;
}

declare global {
  interface Window {
    L: any;
  }
}

export const OpenStreetMapTracker: React.FC<OpenStreetMapTrackerProps> = ({ className = '' }) => {
  const { gpsData, liveTracker, fireDetected } = useTelemetry();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const robotMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const isFollowingRef = useRef<boolean>(true);

  // Pure OpenStreetMap Standard Tile Layer URL (No API key needed, official OpenStreetMap)
  const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

  // Minimal clean location pin (like Google Maps / Apple Maps)
  const createCleanPinHtml = useCallback((heading: number, isFire: boolean) => {
    const pinColor = isFire ? '#EF4444' : '#0284C7';
    const pulseColor = isFire ? 'rgba(239, 68, 68, 0.35)' : 'rgba(2, 132, 199, 0.35)';

    return `
      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Animated soft pulse ring -->
        <div style="position: absolute; inset: 0; border-radius: 9999px; background: ${pulseColor}; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        
        <!-- Directional heading triangle pointer -->
        <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; transform: rotate(${heading}deg); transition: transform 0.4s ease;">
          <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 10px solid ${pinColor}; position: absolute; top: -3px;"></div>
        </div>

        <!-- Center crisp circle pin -->
        <div style="position: relative; width: 22px; height: 22px; border-radius: 9999px; background: #ffffff; border: 3px solid ${pinColor}; box-shadow: 0 4px 12px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; z-index: 10;">
          <div style="width: 8px; height: 8px; border-radius: 9999px; background: ${pinColor};"></div>
        </div>
      </div>
    `;
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;

    const initLeaflet = () => {
      if (!isMounted || !mapContainerRef.current || leafletMapRef.current) return;

      const L = window.L;
      if (!L) return;

      try {
        const map = L.map(mapContainerRef.current, {
          center: [gpsData.latitude, gpsData.longitude],
          zoom: 17,
          zoomControl: false,
          attributionControl: true
        });

        // Official OpenStreetMap Standard Tile Layer
        L.tileLayer(OSM_TILE_URL, {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
        }).addTo(map);

        // Accuracy Circle
        const radiusMeters = Math.max(5, (gpsData.hdop || 0.8) * 6);
        const accuracyCircle = L.circle([gpsData.latitude, gpsData.longitude], {
          radius: radiusMeters,
          color: fireDetected ? '#EF4444' : '#0284C7',
          fillColor: fireDetected ? '#EF4444' : '#0284C7',
          fillOpacity: 0.12,
          weight: 1.5
        }).addTo(map);

        // Custom clean Pin Marker
        const customIcon = L.divIcon({
          className: 'clean-robot-pin',
          html: createCleanPinHtml(gpsData.compassHeading || liveTracker.heading || 0, fireDetected),
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        const robotMarker = L.marker([gpsData.latitude, gpsData.longitude], {
          icon: customIcon
        }).addTo(map);

        map.on('dragstart', () => {
          isFollowingRef.current = false;
        });

        leafletMapRef.current = map;
        robotMarkerRef.current = robotMarker;
        accuracyCircleRef.current = accuracyCircle;
        setMapLoaded(true);
      } catch (err) {
        console.warn('Leaflet initialization warning:', err);
      }
    };

    if (!window.L) {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => initLeaflet();
        document.body.appendChild(script);
      } else {
        document.getElementById('leaflet-js')?.addEventListener('load', initLeaflet);
      }
    } else {
      initLeaflet();
    }

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.remove();
        } catch {}
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update marker position & heading
  useEffect(() => {
    if (!leafletMapRef.current || !robotMarkerRef.current || !window.L) return;

    const L = window.L;
    const newLatLng = [gpsData.latitude, gpsData.longitude];

    robotMarkerRef.current.setLatLng(newLatLng);
    const customIcon = L.divIcon({
      className: 'clean-robot-pin',
      html: createCleanPinHtml(gpsData.compassHeading || liveTracker.heading || 0, fireDetected),
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
    robotMarkerRef.current.setIcon(customIcon);

    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setLatLng(newLatLng);
      accuracyCircleRef.current.setRadius(Math.max(5, (gpsData.hdop || 0.8) * 6));
      accuracyCircleRef.current.setStyle({
        color: fireDetected ? '#EF4444' : '#0284C7',
        fillColor: fireDetected ? '#EF4444' : '#0284C7'
      });
    }

    if (isFollowingRef.current) {
      leafletMapRef.current.panTo(newLatLng, { animate: true, duration: 0.5 });
    }
  }, [gpsData, liveTracker.heading, fireDetected, createCleanPinHtml]);

  // Recenter handler
  const handleRecenter = () => {
    isFollowingRef.current = true;
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([gpsData.latitude, gpsData.longitude], 17, {
        animate: true,
        duration: 0.8
      });
    }
  };

  // Zoom handlers
  const handleZoomIn = () => {
    leafletMapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    leafletMapRef.current?.zoomOut();
  };

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-[#EAE4D9] bg-white shadow-xs ${className}`}>
      {/* Map Viewport */}
      <div className="relative w-full h-[400px] sm:h-[480px]">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Loading fallback */}
        {!mapLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FAF7F2] text-stone-600 p-6 z-10">
            <span className="material-symbols-outlined text-3xl text-stone-400 animate-spin mb-2">progress_activity</span>
            <span className="text-xs font-medium text-stone-500">Loading OpenStreetMap...</span>
          </div>
        )}

        {/* Minimal Clean Map Controls (Floating Top-Right) */}
        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2 shadow-sm">
          {/* Recenter button */}
          <button
            onClick={handleRecenter}
            className="w-10 h-10 rounded-xl bg-white hover:bg-[#F4EFE6] text-stone-700 border border-[#EAE4D9] flex items-center justify-center shadow-xs transition active:scale-95 cursor-pointer"
            title="Recenter on robot"
          >
            <span className="material-symbols-outlined text-xl text-blue-600">my_location</span>
          </button>

          {/* Zoom In */}
          <button
            onClick={handleZoomIn}
            className="w-10 h-10 rounded-t-xl bg-white hover:bg-[#F4EFE6] text-stone-700 border border-[#EAE4D9] flex items-center justify-center shadow-xs transition active:scale-95 cursor-pointer border-b-0"
            title="Zoom In"
          >
            <span className="material-symbols-outlined text-xl">add</span>
          </button>

          {/* Zoom Out */}
          <button
            onClick={handleZoomOut}
            className="w-10 h-10 rounded-b-xl bg-white hover:bg-[#F4EFE6] text-stone-700 border border-[#EAE4D9] flex items-center justify-center shadow-xs transition active:scale-95 cursor-pointer"
            title="Zoom Out"
          >
            <span className="material-symbols-outlined text-xl">remove</span>
          </button>
        </div>
      </div>
    </div>
  );
};
