import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { BITE_AND_GO_BRANCH_LOCATION, buildGoogleMapsNavUrl } from '../../data/karachiAreas';
import { Navigation, MapPin, Store, Bike, ExternalLink, Copy, Check } from 'lucide-react';

export interface DeliveryRouteMapProps {
  destination: {
    lat: number;
    lng: number;
    title?: string;
    address?: string;
  };
  origin?: {
    lat: number;
    lng: number;
    title?: string;
    name?: string;
  };
  riderLocation?: {
    lat: number;
    lng: number;
    name?: string;
    vehiclePlate?: string;
    phone?: string;
    progressPercent?: number;
  };
  height?: string;
  interactivePin?: boolean;
  onPinChange?: (coords: { lat: number; lng: number }) => void;
  showDirectionsButton?: boolean;
}

export const DeliveryRouteMap: React.FC<DeliveryRouteMapProps> = ({
  destination,
  origin = BITE_AND_GO_BRANCH_LOCATION,
  riderLocation,
  height = '280px',
  interactivePin = false,
  onPinChange,
  showDirectionsButton = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [mapError, setMapError] = useState(false);

  // Compute center of map between origin and destination
  const centerLat = (origin.lat + destination.lat) / 2;
  const centerLng = (origin.lng + destination.lng) / 2;

  // Compute straight-line distance approximation
  const latDiff = (destination.lat - origin.lat) * 111;
  const lngDiff = (destination.lng - origin.lng) * 111 * Math.cos((origin.lat * Math.PI) / 180);
  const approxDistanceKm = Math.max(0.5, Math.round(Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 10) / 10);
  const approxMinutes = Math.max(8, Math.round(approxDistanceKm * 3.5 + 5));

  const navUrl = buildGoogleMapsNavUrl(destination.lat, destination.lng, destination.address || destination.title);
  const originTitle = ('title' in origin && origin.title) || ('name' in origin && origin.name) || 'Bite & Go Kitchen';

  // Interpolate rider position if order is on_the_way and rider progress is provided
  const riderLat =
    riderLocation?.lat ??
    (riderLocation && riderLocation.progressPercent !== undefined
      ? origin.lat + (destination.lat - origin.lat) * (riderLocation.progressPercent / 100)
      : undefined);
  const riderLng =
    riderLocation?.lng ??
    (riderLocation && riderLocation.progressPercent !== undefined
      ? origin.lng + (destination.lng - origin.lng) * (riderLocation.progressPercent / 100)
      : undefined);

  const apiKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) ||
    'AIzaSyCbzBCB0w-pZW66lCAZe660lEQd4kPGV6k';

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${destination.lat.toFixed(5)}, ${destination.lng.toFixed(5)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 flex flex-col shadow-inner">
      {/* Top Map HUD Bar */}
      <div className="px-3.5 py-2.5 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-white truncate flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-amber-400" />
            <span>Google Maps Route</span>
          </span>
          <span className="text-[11px] font-mono text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full border border-neutral-700">
            ~{approxDistanceKm} km · {approxMinutes}m ETA
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyCoords}
            title="Copy coordinates"
            className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-colors text-xs flex items-center gap-1"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {showDirectionsButton && (
            <a
              href={navUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Rider Nav</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          )}
        </div>
      </div>

      {/* Embedded Map Area */}
      <div style={{ height }} className="w-full relative bg-neutral-900">
        {!mapError ? (
          <APIProvider apiKey={apiKey} onError={() => setMapError(true)}>
            <Map
              mapId="DEMO_MAP_ID"
              defaultCenter={{ lat: centerLat, lng: centerLng }}
              defaultZoom={13}
              gestureHandling={interactivePin ? 'greedy' : 'cooperative'}
              disableDefaultUI={false}
              zoomControl={true}
              mapTypeControl={false}
              streetViewControl={false}
              fullscreenControl={true}
              className="w-full h-full"
            >
              {/* Restaurant Branch Marker */}
              <AdvancedMarker position={{ lat: origin.lat, lng: origin.lng }} title={originTitle}>
                <div className="flex flex-col items-center">
                  <div className="px-2 py-0.5 bg-neutral-950/90 text-[10px] font-bold text-amber-400 rounded-md shadow border border-amber-500/50 mb-1 whitespace-nowrap flex items-center gap-1">
                    <Store className="w-3 h-3 text-amber-400" />
                    <span>Bite & Go Branch</span>
                  </div>
                  <Pin background="#f59e0b" borderColor="#78350f" glyphColor="#ffffff" scale={1.1} />
                </div>
              </AdvancedMarker>

              {/* Delivery Customer Destination Marker */}
              <AdvancedMarker
                position={{ lat: destination.lat, lng: destination.lng }}
                title={destination.title || 'Delivery Address'}
              >
                <div className="flex flex-col items-center">
                  <div className="px-2 py-0.5 bg-neutral-950/90 text-[10px] font-bold text-emerald-400 rounded-md shadow border border-emerald-500/50 mb-1 whitespace-nowrap flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    <span>Customer Home</span>
                  </div>
                  <Pin background="#10b981" borderColor="#064e3b" glyphColor="#ffffff" scale={1.1} />
                </div>
              </AdvancedMarker>

              {/* Rider Marker (if available) */}
              {riderLat !== undefined && riderLng !== undefined && (
                <AdvancedMarker
                  position={{ lat: riderLat, lng: riderLng }}
                  title={riderLocation?.name || 'Delivery Rider'}
                >
                  <div className="flex flex-col items-center">
                    <div className="px-2 py-0.5 bg-neutral-900 text-[10px] font-bold text-cyan-300 rounded-md shadow border border-cyan-500 mb-1 whitespace-nowrap flex items-center gap-1 animate-pulse">
                      <Bike className="w-3.5 h-3.5" />
                      <span>{riderLocation?.name?.split(' ')[0] || 'Rider'} (En Route)</span>
                    </div>
                    <Pin background="#06b6d4" borderColor="#164e63" glyphColor="#ffffff" scale={1.2} />
                  </div>
                </AdvancedMarker>
              )}
            </Map>
          </APIProvider>
        ) : (
          /* High-fidelity Fallback Route Visualizer if Map API is unavailable */
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-neutral-900 to-neutral-950 text-neutral-300">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3 text-amber-400">
              <Navigation className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">Live Route Navigation Ready</h4>
            <p className="text-xs text-neutral-400 max-w-sm mb-4">
              From North Nazimabad Block I kitchen to {destination.address || destination.title || 'Customer Location'} (~{approxDistanceKm} km).
            </p>
            <a
              href={navUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg transition-all"
            >
              <Navigation className="w-4 h-4" />
              <span>Launch Google Maps Live Directions</span>
            </a>
          </div>
        )}
      </div>

      {/* Bottom Route Details Bar */}
      <div className="px-3.5 py-2.5 bg-neutral-900/90 border-t border-neutral-800 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
          <span className="flex items-center gap-1 text-white font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            Kitchen: Block I, North Nazimabad
          </span>
          <span>→</span>
          <span className="flex items-center gap-1 text-emerald-400 font-medium truncate max-w-[200px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            {destination.address || destination.title || 'Delivery Destination'}
          </span>
        </div>

        {interactivePin && (
          <span className="text-[10px] text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            📍 Drag map to adjust pin position
          </span>
        )}
      </div>
    </div>
  );
};
