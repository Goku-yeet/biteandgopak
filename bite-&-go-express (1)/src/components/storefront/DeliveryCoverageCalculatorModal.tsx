import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Clock,
  Sparkles,
  Search,
  CheckCircle2,
  SlidersHorizontal,
  X,
  Navigation,
  Check,
  ShieldCheck,
  ArrowRight,
  Compass,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Bike,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { StoreSettings } from '../../types';
import {
  KARACHI_DELIVERY_AREAS,
  BITE_AND_GO_BRANCH_LOCATION,
  DeliveryZone,
  calculateHaversineDistanceKm,
  calculateDistanceToBranchKm,
  checkKarachiFreeDeliveryEligibility,
  buildGoogleMapsNavUrl,
} from '../../data/karachiAreas';
import { isStoreOpenNow } from '../../utils/operatingHours';

interface DeliveryCoverageCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  onSelectAreaForOrder?: (areaName: string) => void;
}

// Bounding box for Karachi urban area projection in SVG coordinates
// Karachi center approx: 24.91N, 67.08E
const MAP_BOUNDS = {
  minLat: 24.76, // Southern Clifton / DHA Phase 8
  maxLat: 25.04, // Northern Surjani / Hub Dam
  minLng: 66.95, // Western Baldia / Orangi
  maxLng: 67.22, // Eastern Malir / Airport
};

function latLngToSvg(lat: number, lng: number, width: number, height: number) {
  // Latitude goes UP (higher lat is top of map, smaller y in SVG)
  const y = ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * height;
  // Longitude goes RIGHT (higher lng is right of map, bigger x in SVG)
  const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * width;
  return { x, y };
}

function svgToLatLng(x: number, y: number, width: number, height: number) {
  const lat = MAP_BOUNDS.maxLat - (y / height) * (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat);
  const lng = MAP_BOUNDS.minLng + (x / width) * (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng);
  return {
    lat: Math.round(lat * 10000) / 10000,
    lng: Math.round(lng * 10000) / 10000,
  };
}

export const DeliveryCoverageCalculatorModal: React.FC<DeliveryCoverageCalculatorModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSelectAreaForOrder,
}) => {
  const [selectedAreaName, setSelectedAreaName] = useState<string>(
    settings.freeDeliveryAreas?.[0] || 'North Nazimabad - Block I (Branch Location)'
  );
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery');
  const [searchQuery, setSearchQuery] = useState('');
  const [simulatedSubtotal, setSimulatedSubtotal] = useState<number>(1200);
  const [zoneFilter, setZoneFilter] = useState<'all' | 'free' | '10km' | 'express'>('10km');
  const [activeTab, setActiveTab] = useState<'map' | 'directory'>('map');
  const [customPinCoords, setCustomPinCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(1);

  const openStatus = useMemo(() => isStoreOpenNow(settings), [settings]);

  // Selected Zone from directory
  const matchedZone = useMemo(() => {
    return (
      KARACHI_DELIVERY_AREAS.find((a) => a.name === selectedAreaName) ||
      KARACHI_DELIVERY_AREAS[0]
    );
  }, [selectedAreaName]);

  // Current active destination coordinates (either custom dropped pin or matched zone)
  const activeDestCoords = useMemo(() => {
    if (customPinCoords) return customPinCoords;
    return { lat: matchedZone.lat, lng: matchedZone.lng };
  }, [customPinCoords, matchedZone]);

  // Precise Haversine distance from Bite & Go kitchen
  const haversineDistanceKm = useMemo(() => {
    return calculateDistanceToBranchKm(activeDestCoords.lat, activeDestCoords.lng);
  }, [activeDestCoords]);

  // Standard delivery calculation using precise Haversine formula
  const deliveryEval = useMemo(() => {
    return checkKarachiFreeDeliveryEligibility({
      areaName: customPinCoords ? `Custom Map Pin (${haversineDistanceKm} km)` : selectedAreaName,
      distanceKm: haversineDistanceKm,
      coordinates: activeDestCoords,
      subtotal: simulatedSubtotal,
      settings,
      orderType: deliveryMode,
    });
  }, [selectedAreaName, haversineDistanceKm, activeDestCoords, simulatedSubtotal, settings, deliveryMode, customPinCoords]);

  const maxServiceRadius = settings.deliveryRadiusKm || 14;
  const isOutsideMaxCoverage = haversineDistanceKm > maxServiceRadius;
  const freeRadiusKm = settings.freeDeliveryRadiusKm ?? 3.5;
  const threshold = settings.freeDeliveryThreshold ?? 1800;
  const remainingForFree = Math.max(0, threshold - simulatedSubtotal);

  // ETA Estimation based on exact distance
  const estimatedMinTime = Math.max(15, Math.round(15 + haversineDistanceKm * 1.6));
  const estimatedMaxTime = estimatedMinTime + 10;

  // Filtered areas for browsing
  const filteredAreas = useMemo(() => {
    return KARACHI_DELIVERY_AREAS.map((zone) => {
      const distanceKm = calculateDistanceToBranchKm(zone.lat, zone.lng);
      return { ...zone, distanceKm };
    }).filter((zone) => {
      const matchesSearch = zone.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      const zoneIsFree =
        Boolean(
          settings.freeDeliveryAreas &&
            settings.freeDeliveryAreas.some(
              (a) =>
                a.toLowerCase().trim() === zone.name.toLowerCase().trim() ||
                zone.name.toLowerCase().includes(a.toLowerCase())
            )
        ) ||
        (freeRadiusKm > 0 && zone.distanceKm <= freeRadiusKm);

      const isPaused = Boolean(
        settings.disabledDeliveryAreas &&
        settings.disabledDeliveryAreas.some(
          (a) =>
            a.toLowerCase().trim() === zone.name.toLowerCase().trim() ||
            zone.name.toLowerCase().includes(a.toLowerCase().trim())
        )
      );
      if (isPaused) return false;

      if (zoneFilter === 'free') return zoneIsFree;
      if (zoneFilter === '10km') return zone.distanceKm <= 10.0;
      if (zoneFilter === 'express') return zone.distanceKm <= 5.0;
      return true;
    });
  }, [searchQuery, zoneFilter, settings, freeRadiusKm]);

  // Map SVG Dimensions
  const mapWidth = 560;
  const mapHeight = 380;

  // Calculate SVG positions
  const branchSvg = latLngToSvg(
    BITE_AND_GO_BRANCH_LOCATION.lat,
    BITE_AND_GO_BRANCH_LOCATION.lng,
    mapWidth,
    mapHeight
  );

  const destSvg = latLngToSvg(activeDestCoords.lat, activeDestCoords.lng, mapWidth, mapHeight);

  // Calculate pixel radius for Free Delivery and Max Delivery circles
  // In latitude: 1 degree approx 111 km
  const kmToSvgPixels = (mapHeight / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * (1 / 111);
  const freeRadiusPixels = freeRadiusKm * kmToSvgPixels;
  const maxRadiusPixels = maxServiceRadius * kmToSvgPixels;

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * mapWidth;
    const clickY = ((e.clientY - rect.top) / rect.height) * mapHeight;
    const newCoords = svgToLatLng(clickX, clickY, mapWidth, mapHeight);
    setCustomPinCoords(newCoords);
  };

  const handleResetToBranch = () => {
    setCustomPinCoords(null);
    setSelectedAreaName(KARACHI_DELIVERY_AREAS[0].name);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-neutral-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Karachi Delivery Coverage &amp; Service Radius</h3>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  Haversine GPS Engine
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Calculated live from Bite &amp; Go Central Hub (Block I, North Nazimabad, Karachi)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Operating Hours Alert Bar */}
          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-850 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                    openStatus.isOpen ? 'bg-emerald-400' : 'bg-red-400'
                  } opacity-75`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    openStatus.isOpen ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                />
              </span>
              <div>
                <span className="font-bold text-white block">
                  {openStatus.isOpen ? 'Kitchen Accepting Delivery Orders' : 'Kitchen Closed Right Now'}
                </span>
                <span className="text-[11px] text-neutral-400">{openStatus.reason}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-xl border border-amber-500/25">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{settings.operatingHours || '12:00 PM — 04:00 AM Daily'}</span>
            </div>
          </div>

          {/* Mode Switcher: Delivery vs Self-Pickup */}
          <div className="flex items-center gap-2 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setDeliveryMode('delivery')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                deliveryMode === 'delivery'
                  ? 'bg-amber-500 text-neutral-950 shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Rider Delivery</span>
            </button>
            <button
              type="button"
              onClick={() => setDeliveryMode('pickup')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                deliveryMode === 'pickup'
                  ? 'bg-emerald-500 text-neutral-950 shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Self-Pickup / Takeaway (Always FREE)</span>
            </button>
          </div>

          {/* Tab Switcher: Map vs Directory */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('map')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'map'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Live Interactive Radius Map</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('directory')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'directory'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Karachi Zones Directory ({filteredAreas.length})</span>
              </button>
            </div>

            {activeTab === 'map' && (
              <span className="text-[10px] text-amber-400 font-mono hidden sm:inline-block">
                💡 Click anywhere on map to test custom location
              </span>
            )}
          </div>

          {/* TAB 1: LIVE MAP VISUALIZATION */}
          {activeTab === 'map' && (
            <div className="space-y-3">
              {/* Map Canvas / SVG Container */}
              <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950/90 shadow-xl select-none">
                {/* SVG Visualizer */}
                <svg
                  viewBox={`0 0 ${mapWidth} ${mapHeight}`}
                  className="w-full h-auto cursor-crosshair block"
                  onClick={handleMapClick}
                >
                  {/* Grid background lines */}
                  <defs>
                    <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#262626" strokeWidth="0.5" />
                    </pattern>
                    <radialGradient id="branchGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="freeRadiusGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.04" />
                    </radialGradient>
                  </defs>

                  <rect width={mapWidth} height={mapHeight} fill="url(#gridPattern)" />

                  {/* Arabian Sea coastline indication in South */}
                  <path
                    d={`M 0 ${mapHeight - 35} Q 140 ${mapHeight - 25} 280 ${mapHeight - 45} T ${mapWidth} ${mapHeight - 15} L ${mapWidth} ${mapHeight} L 0 ${mapHeight} Z`}
                    fill="#0f172a"
                    stroke="#1e293b"
                    strokeWidth="1.5"
                  />
                  <text
                    x="20"
                    y={mapHeight - 12}
                    fill="#334155"
                    fontSize="9"
                    fontWeight="bold"
                    letterSpacing="1"
                    fontFamily="monospace"
                  >
                    ARABIAN SEA / CLIFTON COAST
                  </text>

                  {/* Major Highway Artery lines */}
                  {/* Super Highway / M-9 */}
                  <line x1="260" y1="50" x2="420" y2="10" stroke="#262626" strokeWidth="2" strokeDasharray="3 3" />
                  <text x="360" y="24" fill="#525252" fontSize="7" fontFamily="monospace">M-9 SUPER HIGHWAY</text>

                  {/* Shahrah-e-Faisal */}
                  <line x1="220" y1="230" x2="450" y2="210" stroke="#262626" strokeWidth="2" />
                  <text x="330" y="222" fill="#525252" fontSize="7" fontFamily="monospace">SHAHRAH-E-FAISAL</text>

                  {/* Maximum Delivery Radius Circle (e.g. 14 km) */}
                  <circle
                    cx={branchSvg.x}
                    cy={branchSvg.y}
                    r={maxRadiusPixels}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.45"
                  />
                  <text
                    x={branchSvg.x + maxRadiusPixels - 65}
                    y={branchSvg.y - 6}
                    fill="#60a5fa"
                    fontSize="8"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    MAX SERVICE {maxServiceRadius} KM
                  </text>

                  {/* Free Delivery Radius Circle (e.g. 3.5 km) */}
                  <circle
                    cx={branchSvg.x}
                    cy={branchSvg.y}
                    r={freeRadiusPixels}
                    fill="url(#freeRadiusGlow)"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeDasharray="3 2"
                  />
                  <text
                    x={branchSvg.x + freeRadiusPixels + 5}
                    y={branchSvg.y + 4}
                    fill="#34d399"
                    fontSize="8.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    FREE ZONE ({freeRadiusKm} KM)
                  </text>

                  {/* Landmark Reference Labels */}
                  {[
                    { name: 'Surjani Town', lat: 25.015, lng: 67.065 },
                    { name: 'Buffer Zone', lat: 24.958, lng: 67.065 },
                    { name: 'Gulshan-e-Iqbal', lat: 24.918, lng: 67.089 },
                    { name: 'Gulistan-e-Johar', lat: 24.928, lng: 67.135 },
                    { name: 'PECHS', lat: 24.872, lng: 67.065 },
                    { name: 'Clifton', lat: 24.825, lng: 67.03 },
                    { name: 'DHA Phase 6', lat: 24.798, lng: 67.065 },
                  ].map((lm) => {
                    const pt = latLngToSvg(lm.lat, lm.lng, mapWidth, mapHeight);
                    return (
                      <g key={lm.name} opacity="0.6">
                        <circle cx={pt.x} cy={pt.y} r="2.5" fill="#525252" />
                        <text
                          x={pt.x + 5}
                          y={pt.y + 3}
                          fill="#737373"
                          fontSize="7.5"
                          fontFamily="sans-serif"
                        >
                          {lm.name}
                        </text>
                      </g>
                    );
                  })}

                  {/* Route Polyline from Branch to Target Destination */}
                  <line
                    x1={branchSvg.x}
                    y1={branchSvg.y}
                    x2={destSvg.x}
                    y2={destSvg.y}
                    stroke={deliveryEval.isFree ? '#10b981' : isOutsideMaxCoverage ? '#ef4444' : '#f59e0b'}
                    strokeWidth="2.5"
                    strokeDasharray="5 3"
                  />

                  {/* Mid-route Distance Marker Callout */}
                  {haversineDistanceKm > 0.4 && (
                    <g
                      transform={`translate(${(branchSvg.x + destSvg.x) / 2}, ${(branchSvg.y + destSvg.y) / 2})`}
                    >
                      <rect
                        x="-40"
                        y="-10"
                        width="80"
                        height="20"
                        rx="10"
                        fill="#0a0a0a"
                        stroke={deliveryEval.isFree ? '#10b981' : '#f59e0b'}
                        strokeWidth="1.5"
                      />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="8.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        ~{haversineDistanceKm} KM
                      </text>
                    </g>
                  )}

                  {/* Bite & Go Central Hub Marker */}
                  <g transform={`translate(${branchSvg.x}, ${branchSvg.y})`}>
                    <circle r="18" fill="url(#branchGlow)" />
                    <circle r="8" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                    <circle r="3" fill="#171717" />
                    <text
                      x="12"
                      y="-8"
                      fill="#f59e0b"
                      fontSize="9"
                      fontWeight="black"
                      fontFamily="sans-serif"
                    >
                      BITE &amp; GO HUB (Block I)
                    </text>
                  </g>

                  {/* Customer Destination Marker */}
                  <g transform={`translate(${destSvg.x}, ${destSvg.y})`}>
                    <circle
                      r="12"
                      fill={deliveryEval.isFree ? '#10b981' : isOutsideMaxCoverage ? '#ef4444' : '#3b82f6'}
                      opacity="0.3"
                    />
                    <circle
                      r="6.5"
                      fill={deliveryEval.isFree ? '#10b981' : isOutsideMaxCoverage ? '#ef4444' : '#3b82f6'}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text
                      x="10"
                      y="14"
                      fill="#ffffff"
                      fontSize="8.5"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      {customPinCoords
                        ? `Custom Pin (~${haversineDistanceKm} km)`
                        : selectedAreaName.split(' - ')[0]}
                    </text>
                  </g>
                </svg>

                {/* Map Floating Controls Overlay */}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-neutral-900/90 backdrop-blur-md p-1.5 rounded-xl border border-neutral-800">
                  <button
                    type="button"
                    onClick={handleResetToBranch}
                    className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
                    title="Reset to Central Kitchen Hub"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={buildGoogleMapsNavUrl(activeDestCoords.lat, activeDestCoords.lng)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-amber-400 hover:text-amber-300 rounded-lg hover:bg-neutral-800 flex items-center gap-1 text-[10px] font-bold"
                    title="Open in Google Maps Navigation"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Google Maps</span>
                  </a>
                </div>

                {/* Map Legend */}
                <div className="p-2.5 bg-neutral-950 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-[10.5px]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold font-mono">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      Free Zone (&lt;{freeRadiusKm}km)
                    </span>
                    <span className="flex items-center gap-1 text-blue-400 font-semibold font-mono">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                      Standard Express (&lt;{maxServiceRadius}km)
                    </span>
                    <span className="flex items-center gap-1 text-neutral-400 font-semibold font-mono">
                      <span className="w-2.5 h-2.5 rounded-full bg-neutral-600 inline-block" />
                      Extended Zone
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    GPS: {activeDestCoords.lat.toFixed(4)}°N, {activeDestCoords.lng.toFixed(4)}°E
                  </span>
                </div>
              </div>

              {/* Area Quick Selector Dropdown & Popular Pills */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-neutral-300 block">
                    Choose Delivery Destination Area or Click Map:
                  </label>
                  {customPinCoords && (
                    <button
                      type="button"
                      onClick={() => setCustomPinCoords(null)}
                      className="text-[10px] text-amber-400 hover:underline font-mono"
                    >
                      Clear custom pin (Revert to dropdown)
                    </button>
                  )}
                </div>

                <select
                  value={selectedAreaName}
                  onChange={(e) => {
                    setSelectedAreaName(e.target.value);
                    setCustomPinCoords(null);
                  }}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                >
                  {KARACHI_DELIVERY_AREAS.filter((a) => {
                    const isPaused = Boolean(
                      settings.disabledDeliveryAreas &&
                      settings.disabledDeliveryAreas.some(
                        (da) =>
                          da.toLowerCase().trim() === a.name.toLowerCase().trim() ||
                          a.name.toLowerCase().includes(da.toLowerCase().trim())
                      )
                    );
                    return !isPaused;
                  }).map((a) => (
                    <option key={a.name} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                </select>

                {/* Quick Free Delivery Spotlight Pills */}
                {settings.freeDeliveryAreas && settings.freeDeliveryAreas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {settings.freeDeliveryAreas.map((areaName) => (
                      <button
                        key={areaName}
                        type="button"
                        onClick={() => {
                          setSelectedAreaName(areaName);
                          setCustomPinCoords(null);
                        }}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                          selectedAreaName === areaName && !customPinCoords
                            ? 'bg-emerald-500 text-neutral-950 border-emerald-400 font-bold shadow'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                        }`}
                      >
                        ✓ {areaName.split(' - ')[0]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DIRECTORY SEARCH & BROWSE */}
          {activeTab === 'directory' && (
            <div className="space-y-3">
              {/* Filters */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setZoneFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                      zoneFilter === 'all'
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    All Zones ({KARACHI_DELIVERY_AREAS.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoneFilter('10km')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                      zoneFilter === '10km'
                        ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                        : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    🎯 10 KM Express Radius ({KARACHI_DELIVERY_AREAS.filter(z => z.distanceKm <= 10.0).length} Areas)
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoneFilter('free')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                      zoneFilter === 'free'
                        ? 'bg-emerald-500 text-neutral-950 font-bold'
                        : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    Free Delivery Zones Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoneFilter('express')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                      zoneFilter === 'express'
                        ? 'bg-blue-500 text-white font-bold'
                        : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    Immediate Vicinity (&lt; 5 KM)
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search neighborhood (e.g. Hyderi, Buffer Zone, Gulshan, DHA...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* List of Karachi Areas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
                {filteredAreas.map((area) => {
                  const isSelected = selectedAreaName === area.name && !customPinCoords;
                  const zoneDistance = area.distanceKm;
                  const zoneEval = checkKarachiFreeDeliveryEligibility({
                    areaName: area.name,
                    distanceKm: zoneDistance,
                    subtotal: simulatedSubtotal,
                    settings,
                    orderType: 'delivery',
                  });

                  return (
                    <div
                      key={area.name}
                      onClick={() => {
                        setSelectedAreaName(area.name);
                        setCustomPinCoords(null);
                        setActiveTab('map');
                      }}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500/60 shadow-sm'
                          : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-950'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate text-xs">{area.name}</p>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          Active Karachi Express Delivery Zone
                        </span>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        {zoneEval.isFree ? (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-black font-mono">
                            FREE
                          </span>
                        ) : (
                          <span className="text-[9px] bg-neutral-900 text-neutral-400 border border-neutral-800 px-2 py-0.5 rounded font-mono">
                            Rs. {zoneEval.calculatedFee}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CALCULATOR RESULTS & FEE BREAKDOWN BOX */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 border border-amber-500/30 space-y-3.5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Live Rate Evaluation (Haversine Verified)</span>
              </span>
              <span className="text-[11px] font-mono text-neutral-400">
                Rate: Rs. {settings.baseDeliveryFee || 100} base + Rs. {settings.deliveryRatePerKm || 20}/km
              </span>
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-0.5">
                <span className="text-[10px] text-neutral-400 uppercase font-mono block">Haversine Distance</span>
                <span className="text-sm font-bold font-mono text-white">
                  {deliveryMode === 'pickup' ? '0 KM' : `~${haversineDistanceKm} KM`}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-0.5">
                <span className="text-[10px] text-neutral-400 uppercase font-mono block">Estimated ETA</span>
                <span className="text-sm font-bold font-mono text-amber-400">
                  {deliveryMode === 'pickup' ? '12–15 Mins (Ready)' : `${estimatedMinTime}–${estimatedMaxTime} Mins`}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-0.5">
                <span className="text-[10px] text-neutral-400 uppercase font-mono block">Calculated Distance Fee</span>
                <span className="text-sm font-bold font-mono text-neutral-400">
                  {deliveryMode === 'pickup' ? 'Rs. 0' : `Rs. ${deliveryEval.calculatedFee}`}
                </span>
              </div>

              <div
                className={`p-2.5 rounded-xl border space-y-0.5 ${
                  deliveryEval.effectiveFee === 0 || deliveryMode === 'pickup'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-neutral-950 border-neutral-800 text-white'
                }`}
              >
                <span className="text-[10px] uppercase font-mono block">Final Fee</span>
                <span className="text-sm font-black font-mono">
                  {deliveryEval.effectiveFee === 0 || deliveryMode === 'pickup'
                    ? 'FREE 🚀'
                    : `Rs. ${deliveryEval.effectiveFee}`}
                </span>
              </div>
            </div>

            {/* Out of coverage warning or Free delivery unlocked */}
            {isOutsideMaxCoverage ? (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>
                  Destination is {haversineDistanceKm} km away (exceeds {maxServiceRadius} km kitchen radius limit). Please choose self-pickup or call branch.
                </span>
              </div>
            ) : deliveryMode === 'pickup' ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-xs">
                  🎉 Self-Pickup / Takeaway is always 100% FREE! Collect piping hot from North Nazimabad Block I counter in 15 mins.
                </span>
              </div>
            ) : deliveryEval.isFree ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-xs">
                  🎉 Free Delivery Unlocked: {deliveryEval.reason}!
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-neutral-300">
                  <span>
                    Simulate Cart: Add <strong className="text-amber-400 font-mono">Rs. {remainingForFree}</strong> more to unlock FREE Delivery
                  </span>
                  <span className="font-mono text-neutral-400 text-[11px]">
                    Subtotal: Rs. {simulatedSubtotal} / {threshold}
                  </span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="3500"
                  step="50"
                  value={simulatedSubtotal}
                  onChange={(e) => setSimulatedSubtotal(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            )}

            {/* CTA Button to Apply Area to Order */}
            {onSelectAreaForOrder && !isOutsideMaxCoverage && (
              <button
                type="button"
                onClick={() => {
                  onSelectAreaForOrder(selectedAreaName);
                  onClose();
                }}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <span>Select {selectedAreaName.split(' - ')[0]} for Order Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px]">Hot Thermal Insulation Bags &amp; Exact GPS Distance Guaranteed</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-xl text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
