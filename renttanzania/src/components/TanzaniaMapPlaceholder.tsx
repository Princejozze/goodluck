import React, { useState } from 'react';
import { Asset, AppLanguage } from '../types/index.js';
import { formatTZS } from '../utils/formatters.js';
import {
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Navigation,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  ArrowRight,
  HardHat,
  Tractor,
  Truck,
  Video,
  Wrench,
  Layers,
} from 'lucide-react';

interface TanzaniaMapPlaceholderProps {
  assets: Asset[];
  onSelectAsset: (asset: Asset) => void;
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
  language: AppLanguage;
}

export const TanzaniaMapPlaceholder: React.FC<TanzaniaMapPlaceholderProps> = ({
  assets,
  onSelectAsset,
  selectedRegion,
  onSelectRegion,
  language,
}) => {
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(
    assets.length > 0 ? assets[0].id : null
  );
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Region fallback coordinates for assets without explicit lat/lng
  const regionCoords: Record<string, { lat: number; lng: number }> = {
    'dar es salaam': { lat: -6.78, lng: 39.26 },
    'arusha': { lat: -3.38, lng: 36.68 },
    'mwanza': { lat: -2.52, lng: 32.90 },
    'dodoma': { lat: -6.17, lng: 35.74 },
    'zanzibar': { lat: -6.16, lng: 39.22 },
    'mbeya': { lat: -8.90, lng: 33.45 },
    'morogoro': { lat: -6.82, lng: 37.66 },
    'tanga': { lat: -5.07, lng: 39.10 },
    'moshi': { lat: -3.34, lng: 37.34 },
  };

  const getCoordinates = (asset: Asset, index: number) => {
    let lat = asset.location.coordinates?.lat;
    let lng = asset.location.coordinates?.lng;

    if (!lat || !lng) {
      const reg = asset.location.region.toLowerCase();
      const fallback = regionCoords[reg] || { lat: -6.8, lng: 39.2 };
      // Slight jitter so multiple pins in the same city don't completely overlap
      lat = fallback.lat + ((index % 3) - 1) * 0.14;
      lng = fallback.lng + (Math.floor(index / 3) - 0.5) * 0.16;
    }

    // Map bounds: Lng [29.0, 40.5] (11.5 deg), Lat [-1.0, -11.8] (10.8 deg)
    const mapWidth = 720;
    const mapHeight = 580;
    const padX = 45;
    const padY = 40;

    const x = padX + ((lng - 29.0) / 11.5) * (mapWidth - padX * 2);
    const y = padY + ((lat - -1.0) / -10.8) * (mapHeight - padY * 2);

    return { x: Math.max(30, Math.min(mapWidth - 30, x)), y: Math.max(30, Math.min(mapHeight - 30, y)) };
  };

  const selectedAsset = assets.find((a) => a.id === selectedAssetId) || assets[0];

  const hubButtons = [
    { name: 'All Tanzania', region: 'all' },
    { name: 'Dar es Salaam', region: 'Dar es Salaam' },
    { name: 'Arusha', region: 'Arusha' },
    { name: 'Mwanza', region: 'Mwanza' },
    { name: 'Dodoma', region: 'Dodoma' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm flex flex-col my-6">
      {/* Top Map Header & Controls */}
      <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-amber-700" />
          <span className="font-bold text-stone-900">
            {language === 'sw'
              ? 'Ramani ya Vifaa vya Tanzania'
              : language === 'fr'
              ? 'Carte du Matériel en Tanzanie'
              : 'Tanzania Fleet & Asset Locator'}
          </span>
          <span className="text-stone-400">·</span>
          <span className="text-stone-600 font-mono">
            {assets.length}{' '}
            {language === 'sw'
              ? 'vifaa vinavyopatikana'
              : language === 'fr'
              ? 'équipements disponibles'
              : 'assets available'}
          </span>
        </div>

        {/* Quick Region Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {hubButtons.map((hub) => (
            <button
              key={hub.region}
              onClick={() => onSelectRegion(hub.region)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                selectedRegion === hub.region
                  ? 'bg-stone-900 text-white'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
              }`}
            >
              {hub.name}
            </button>
          ))}
        </div>

        {/* Map Legend & Zoom Controls */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-stone-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
              <span>RENTZ Fleet</span>
            </span>
            <span className="flex items-center gap-1 text-stone-700">
              <span className="w-2.5 h-2.5 rounded-full bg-stone-900 inline-block" />
              <span>Verified Owner</span>
            </span>
          </div>

          <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-white">
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
              className="p-1.5 hover:bg-stone-100 text-stone-600 cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="px-2 text-[10px] font-mono text-stone-500 border-x border-stone-200 hover:bg-stone-100 cursor-pointer"
              title="Reset zoom"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.9, z - 0.1))}
              className="p-1.5 hover:bg-stone-100 text-stone-600 cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Map View Area */}
      <div className="relative grid grid-cols-1 lg:grid-cols-12 min-h-[540px] bg-stone-100 overflow-hidden">
        {/* SVG Tanzania Vector Map Area */}
        <div className="lg:col-span-8 relative flex items-center justify-center p-4 overflow-hidden select-none">
          {/* Subtle Grid Watermark / Background Texture */}
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#78716c_1px,transparent_1px)] [background-size:20px_20px]" />

          <svg
            viewBox="0 0 720 580"
            className="w-full h-full max-h-[520px] transition-transform duration-200"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <defs>
              <linearGradient id="tzLandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f5f5f4" />
                <stop offset="100%" stopColor="#e7e5e4" />
              </linearGradient>
              <linearGradient id="tzLakeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#bae6fd" />
                <stop offset="100%" stopColor="#7dd3fc" />
              </linearGradient>
              <filter id="pinShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25" />
              </filter>
            </defs>

            {/* Indian Ocean Backdrop (East) */}
            <path
              d="M 590 0 L 720 0 L 720 580 L 590 580 C 560 480 620 380 580 320 C 560 260 610 180 580 90 Z"
              fill="#f0f9ff"
            />
            <text x="640" y="240" fill="#93c5fd" fontSize="11" fontWeight="600" letterSpacing="2" className="select-none">
              INDIAN OCEAN
            </text>

            {/* Lake Victoria (North) */}
            <path
              d="M 180 30 C 220 15 280 20 310 60 C 300 110 240 120 190 90 C 170 70 170 45 180 30 Z"
              fill="url(#tzLakeGrad)"
              stroke="#0284c7"
              strokeWidth="1"
              opacity="0.8"
            />
            <text x="210" y="70" fill="#0369a1" fontSize="10" fontWeight="600" letterSpacing="1">
              LAKE VICTORIA
            </text>

            {/* Lake Tanganyika (West) */}
            <path
              d="M 60 170 C 75 220 85 300 110 390 C 100 395 85 385 75 320 C 65 260 50 200 60 170 Z"
              fill="url(#tzLakeGrad)"
              stroke="#0284c7"
              strokeWidth="1"
              opacity="0.75"
            />
            <text x="35" y="290" fill="#0369a1" fontSize="9" fontWeight="600" transform="rotate(-75 35 290)">
              LAKE TANGANYIKA
            </text>

            {/* Lake Nyasa / Malawi (South) */}
            <path
              d="M 330 460 C 350 490 370 530 380 570 C 370 575 355 540 340 500 C 330 480 325 465 330 460 Z"
              fill="url(#tzLakeGrad)"
              stroke="#0284c7"
              strokeWidth="1"
              opacity="0.75"
            />

            {/* Tanzania Mainland Authentic Boundary Path */}
            <path
              d="M 140 50 
                 C 210 30 310 50 360 40 
                 C 440 35 480 80 520 120 
                 C 550 140 580 160 590 190 
                 C 580 220 570 260 595 315 
                 C 610 350 600 410 590 450 
                 C 580 490 595 530 580 560 
                 C 520 550 460 560 400 550 
                 C 370 510 350 460 320 440 
                 C 280 445 230 460 180 450 
                 C 130 440 100 410 95 380 
                 C 80 320 65 240 70 170 
                 C 80 130 110 90 140 50 Z"
              fill="url(#tzLandGrad)"
              stroke="#d6d3d1"
              strokeWidth="2"
              strokeLinejoin="round"
            />

            {/* Zanzibar Archipelago (Offshore Islands) */}
            {/* Unguja Island */}
            <ellipse cx="600" cy="275" rx="7" ry="16" fill="#e7e5e4" stroke="#d97706" strokeWidth="1.5" />
            <text x="612" y="278" fill="#b45309" fontSize="9" fontWeight="700">
              Zanzibar
            </text>
            {/* Pemba Island */}
            <ellipse cx="605" cy="215" rx="5" ry="12" fill="#e7e5e4" stroke="#d6d3d1" strokeWidth="1" />

            {/* Major Transport Corridors (Subtle dotted logistics lines) */}
            <path
              d="M 590 317 L 500 310 L 400 285 L 250 115"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <path
              d="M 590 317 L 550 200 L 450 150"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <path
              d="M 400 285 L 280 420"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />

            {/* Region Label Watermarks */}
            <g fill="#a8a29e" fontSize="11" fontWeight="700" letterSpacing="0.5">
              <text x="545" y="340">DAR ES SALAAM</text>
              <text x="435" y="140">ARUSHA</text>
              <text x="230" y="135">MWANZA</text>
              <text x="380" y="275">DODOMA</text>
              <text x="260" y="445">MBEYA</text>
              <text x="470" y="305">MOROGORO</text>
              <text x="525" y="195">TANGA</text>
            </g>

            {/* Mount Kilimanjaro Peak Marker */}
            <g transform="translate(475, 140)">
              <polygon points="0,-8 6,2 -6,2" fill="#0284c7" />
              <text x="10" y="2" fill="#0369a1" fontSize="8" fontWeight="600">Mt Kilimanjaro</text>
            </g>

            {/* Asset Location Markers / Pins */}
            {assets.map((asset, idx) => {
              const coords = getCoordinates(asset, idx);
              const isSelected = asset.id === selectedAssetId;
              const isCompany = asset.ownershipType === 'company';

              return (
                <g
                  key={asset.id}
                  transform={`translate(${coords.x}, ${coords.y})`}
                  className="cursor-pointer group"
                  onClick={() => setSelectedAssetId(asset.id)}
                >
                  {/* Outer pulse indicator for selected or company fleet */}
                  {isSelected && (
                    <circle
                      r="18"
                      fill={isCompany ? '#f59e0b' : '#0284c7'}
                      opacity="0.3"
                      className="animate-ping"
                    />
                  )}

                  {/* Pin Drop Pin Body */}
                  <g filter="url(#pinShadow)">
                    <path
                      d="M 0 0 C -9 -14 -11 -24 0 -30 C 11 -24 9 -14 0 0 Z"
                      fill={isCompany ? '#b45309' : isSelected ? '#d97706' : '#1c1917'}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <circle
                      cx="0"
                      cy="-18"
                      r="6"
                      fill="#ffffff"
                    />
                    {isCompany ? (
                      <circle cx="0" cy="-18" r="3.5" fill="#b45309" />
                    ) : (
                      <circle cx="0" cy="-18" r="3.5" fill="#0369a1" />
                    )}
                  </g>

                  {/* Price Label Pill Above Pin */}
                  <g transform="translate(0, -36)">
                    <rect
                      x="-38"
                      y="-14"
                      width="76"
                      height="16"
                      rx="4"
                      fill="#1c1917"
                      fillOpacity="0.88"
                    />
                    <text
                      x="0"
                      y="-3"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      {formatTZS(asset.pricing.ratePerDay).replace('TSh ', '')}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Compass Rose Widget in Corner */}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-xs p-2 rounded-xl border border-stone-200 shadow-xs flex items-center gap-2 text-[10px] font-mono text-stone-600">
            <span className="w-2 h-2 rounded-full bg-amber-600" />
            <span>TANZANIA GIS · WGS 84</span>
          </div>
        </div>

        {/* Side Panel: Selected Asset Preview Details */}
        <div className="lg:col-span-4 bg-white border-t lg:border-t-0 lg:border-l border-stone-200 p-5 flex flex-col justify-between">
          {selectedAsset ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-1.5 text-xs text-stone-500">
                  <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span className="font-semibold text-stone-900">
                    {selectedAsset.location.district}, {selectedAsset.location.region}
                  </span>
                </div>
                {selectedAsset.ownershipType === 'company' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                    <ShieldCheck className="w-3 h-3" />
                    Fleet
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3 text-amber-700" />
                    Verified Owner
                  </span>
                )}
              </div>

              {/* Asset Photo Preview */}
              <div className="aspect-16/10 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 relative group">
                <img
                  src={selectedAsset.images[0] || '/src/assets/images/hero_equipment_fleet_1792692516554.jpg'}
                  alt={selectedAsset.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-2 left-2 right-2 bg-stone-950/75 backdrop-blur-xs px-2.5 py-1 rounded text-white text-[11px] flex justify-between items-center">
                  <span className="capitalize">{selectedAsset.condition} condition</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {selectedAsset.totalRentals} hires completed
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-sm font-extrabold text-stone-900 leading-snug line-clamp-2">
                  {selectedAsset.title}
                </h3>
                <p className="mt-1 text-xs text-stone-500 line-clamp-2 leading-relaxed">
                  {selectedAsset.description}
                </p>
              </div>

              {/* Quick Specs */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1.5">
                <div className="flex justify-between text-stone-600">
                  <span>Location Landmark</span>
                  <span className="font-medium text-stone-900 truncate max-w-[170px]">
                    {selectedAsset.location.landmark || selectedAsset.location.district}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Site Delivery</span>
                  <span className="font-medium text-stone-900">
                    {selectedAsset.deliveryOptions.deliveryAvailable ? 'Available' : 'Pickup Only'}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Machine Operator</span>
                  <span className="font-medium text-stone-900">
                    {selectedAsset.deliveryOptions.operatorAvailable ? 'Available' : 'Self-Operated'}
                  </span>
                </div>
              </div>

              {/* Price & Primary CTA */}
              <div className="pt-2">
                <div className="flex items-baseline justify-between mb-3">
                  <div>
                    <p className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Rental Rate</p>
                    <p className="text-xl font-extrabold text-stone-900 font-mono tabular-nums">
                      {formatTZS(selectedAsset.pricing.ratePerDay)}
                      <span className="text-xs font-normal text-stone-500 font-sans"> / day</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Minimum Hire</p>
                    <p className="text-xs font-bold font-mono text-stone-700">
                      {selectedAsset.pricing.minimumRentalDays || 1} day(s)
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onSelectAsset(selectedAsset)}
                  className="w-full py-2.5 px-4 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 active:bg-amber-900 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>
                    {language === 'sw'
                      ? 'Tazama & Kodisha Kifaa Hiki'
                      : language === 'fr'
                      ? 'Voir & Réserver cet Équipement'
                      : 'Hire This Equipment & Review Quote'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-stone-400">
              <MapPin className="w-8 h-8 mb-2" />
              <p className="text-xs font-semibold text-stone-600">
                {language === 'sw'
                  ? 'Bofya alama yoyote kwenye ramani ili kutazama kifaa'
                  : language === 'fr'
                  ? 'Cliquez sur un marqueur de la carte pour prévisualiser le matériel'
                  : 'Click any marker on the map to preview equipment'}
              </p>
            </div>
          )}

          {/* Quick Hub Switching Footnote */}
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
            <span>Click any pin to inspect equipment</span>
            <span className="font-mono text-amber-700 font-medium">GPS Grounded</span>
          </div>
        </div>
      </div>
    </div>
  );
};
