import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Loader2, Search, CheckCircle2 } from 'lucide-react';

interface GoogleMapsDestinationInputProps {
  originAddress: string;
  originCoords?: { lat: number; lng: number };
  destinationAddress: string;
  onDestinationChange: (address: string) => void;
  onDistanceCalculated: (distanceKm: number) => void;
}

function checkQuotaError(err: unknown) {
  const msg = String((err as any)?.message || err || '');
  if (
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OverQuotaMapError') ||
    msg.includes('QuotaExceededError') ||
    (err as any)?.status === 429
  ) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
}

interface RouteOverlayProps {
  origin: { lat: number; lng: number } | string;
  destination: { lat: number; lng: number } | string | null;
  onRouteResult: (result: { distanceKm: number; durationMins: number } | null) => void;
  onCalculatingChange: (calculating: boolean) => void;
  onRouteError: (msg: string | null) => void;
}

const RouteOverlay: React.FC<RouteOverlayProps> = ({
  origin,
  destination,
  onRouteResult,
  onCalculatingChange,
  onRouteError,
}) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<any[]>([]);

  useEffect(() => {
    if (!routesLib || !map || !origin || !destination) return;

    // Cleanup previous polylines
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    onRouteError(null);
    onCalculatingChange(true);

    const request = {
      origin,
      destination,
      travelMode: 'DRIVING',
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
    };

    const RouteClass = (routesLib as any).Route;
    if (!RouteClass || typeof RouteClass.computeRoutes !== 'function') {
      onCalculatingChange(false);
      return;
    }

    RouteClass.computeRoutes(request)
      .then(({ routes }: { routes: any[] }) => {
        onCalculatingChange(false);
        if (!routes || routes.length === 0) {
          onRouteError('Could not find a driving route to that destination. Try a nearby landmark or district.');
          onRouteResult(null);
          return;
        }

        const primaryRoute = routes[0];

        if (typeof primaryRoute.createPolylines === 'function') {
          const newPolylines = primaryRoute.createPolylines();
          newPolylines.forEach((polyline: any) => {
            polyline.setOptions({
              strokeColor: '#b45309',
              strokeWeight: 5,
            });
            polyline.setMap(map);
          });
          polylinesRef.current = newPolylines;
        }

        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport);
        }

        const distanceMeters = primaryRoute.distanceMeters ?? 1000;
        const durationMillis = primaryRoute.durationMillis ?? 0;
        const distanceKm = Math.max(0.5, Number((distanceMeters / 1000).toFixed(1)));
        const durationMins = Math.max(1, Math.round(durationMillis / 60000));

        onRouteResult({ distanceKm, durationMins });
      })
      .catch((err: unknown) => {
        onCalculatingChange(false);
        checkQuotaError(err);
        console.error('Error computing Google Maps route:', err);
        onRouteError('Unable to calculate driving route for this destination.');
      });

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [routesLib, map, origin, destination]);

  return null;
};

export const GoogleMapsDestinationInput: React.FC<GoogleMapsDestinationInputProps> = ({
  originAddress,
  originCoords,
  destinationAddress,
  onDestinationChange,
  onDistanceCalculated,
}) => {
  const placesLib = useMapsLibrary('places');
  const sessionTokenRef = useRef<any | null>(null);

  const [inputValue, setInputValue] = useState(destinationAddress);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const defaultOrigin = originCoords || { lat: -6.7924, lng: 39.2083 };
  const [activeDestination, setActiveDestination] = useState<{ lat: number; lng: number } | string | null>(
    destinationAddress ? `${destinationAddress}, Tanzania` : null
  );
  const [destinationPinCoords, setDestinationPinCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [routeSummary, setRouteSummary] = useState<{ distanceKm: number; durationMins: number } | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Fetch Places Autocomplete (New) suggestions when typing
  useEffect(() => {
    if (!placesLib || !showDropdown) return;
    const trimmed = inputValue.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib as any;
      if (!AutocompleteSuggestion) return;
      if (!sessionTokenRef.current && AutocompleteSessionToken) {
        sessionTokenRef.current = new AutocompleteSessionToken();
      }

      setIsLoadingSuggestions(true);
      AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: trimmed,
        sessionToken: sessionTokenRef.current,
        region: 'tz',
      })
        .then((res: any) => {
          setSuggestions(res?.suggestions || []);
          setIsLoadingSuggestions(false);
        })
        .catch((err: unknown) => {
          checkQuotaError(err);
          console.error('Error fetching autocomplete suggestions:', err);
          setIsLoadingSuggestions(false);
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [placesLib, inputValue, showDropdown]);

  const handleSelectSuggestion = useCallback(
    async (suggestion: any) => {
      if (!placesLib || !suggestion.placePrediction) return;
      setShowDropdown(false);
      setSuggestions([]);

      try {
        const place = suggestion.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location', 'viewport'],
        });

        sessionTokenRef.current = null;

        const label =
          place.formattedAddress ||
          place.displayName ||
          suggestion.placePrediction.text?.text ||
          inputValue;

        setInputValue(label);
        onDestinationChange(label);

        if (place.location) {
          const lat = typeof place.location.lat === 'function' ? place.location.lat() : (place.location as any).lat;
          const lng = typeof place.location.lng === 'function' ? place.location.lng() : (place.location as any).lng;
          setDestinationPinCoords({ lat, lng });
          setActiveDestination({ lat, lng });
        } else {
          setDestinationPinCoords(null);
          setActiveDestination(label);
        }
      } catch (err) {
        checkQuotaError(err);
        console.error('Error fetching place details:', err);
      }
    },
    [placesLib, inputValue, onDestinationChange]
  );

  const handleManualDestinationLookup = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setShowDropdown(false);
    onDestinationChange(trimmed);
    setDestinationPinCoords(null);
    const queryWithCountry = trimmed.toLowerCase().includes('tanzania')
      ? trimmed
      : `${trimmed}, Tanzania`;
    setActiveDestination(queryWithCountry);
  };

  const handleRouteResult = useCallback(
    (result: { distanceKm: number; durationMins: number } | null) => {
      setRouteSummary(result);
      if (result) {
        onDistanceCalculated(result.distanceKm);
      }
    },
    [onDistanceCalculated]
  );

  return (
    <div className="mt-2.5 space-y-2.5 pt-2.5 border-t border-stone-200/80">
      <div>
        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
          Customer Delivery Destination
        </label>
        <div className="relative">
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <MapPin className="w-3.5 h-3.5 text-amber-700 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={inputValue}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  onDestinationChange(e.target.value);
                  setShowDropdown(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleManualDestinationLookup();
                  }
                }}
                placeholder="Enter customer destination or site location..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
              {(isLoadingSuggestions || isCalculatingRoute) && (
                <Loader2 className="w-3.5 h-3.5 text-amber-700 animate-spin absolute right-2.5 top-2.5" />
              )}
            </div>
            <button
              type="button"
              onClick={handleManualDestinationLookup}
              className="px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-semibold rounded-lg flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
            >
              <Search className="w-3 h-3" />
              <span>Locate</span>
            </button>
          </div>

          {/* Places Autocomplete Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <ul className="absolute z-30 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-48 overflow-y-auto divide-y divide-stone-100">
              {suggestions.map((suggestion, index) => {
                const text = suggestion.placePrediction?.text?.text || '';
                return (
                  <li
                    key={index}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="px-3 py-2 text-xs text-stone-800 hover:bg-amber-50 cursor-pointer flex items-start gap-2 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                    <span className="truncate">{text}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Google Maps Route Preview & Automatic Distance */}
      <div className="rounded-lg overflow-hidden border border-stone-200 bg-white">
        <div className="w-full h-36 relative">
          <Map
            mapId="DEMO_MAP_ID"
            defaultCenter={defaultOrigin}
            defaultZoom={11}
            gestureHandling="cooperative"
            disableDefaultUI={true}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            className="w-full h-full"
          >
            <AdvancedMarker position={defaultOrigin} title={`Available at: ${originAddress}`}>
              <Pin background="#0f172a" glyphColor="#ffffff" borderColor="#0f172a" />
            </AdvancedMarker>

            {destinationPinCoords && (
              <AdvancedMarker position={destinationPinCoords} title={`Customer Destination: ${destinationAddress}`}>
                <Pin background="#b45309" glyphColor="#ffffff" borderColor="#78350f" />
              </AdvancedMarker>
            )}

            <RouteOverlay
              origin={originCoords || `${originAddress}, Tanzania`}
              destination={activeDestination}
              onRouteResult={handleRouteResult}
              onCalculatingChange={setIsCalculatingRoute}
              onRouteError={setRouteError}
            />
          </Map>
        </div>

        <div className="px-2.5 py-2 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-[11px]">
          <div className="text-stone-700">
            {isCalculatingRoute ? (
              <span className="flex items-center gap-1.5 text-stone-500">
                <Loader2 className="w-3 h-3 animate-spin text-amber-700" />
                <span>Calculating driving route from {originAddress}...</span>
              </span>
            ) : routeError ? (
              <span className="text-amber-800">{routeError}</span>
            ) : routeSummary ? (
              <div>
                <div className="flex items-center gap-1.5 font-semibold text-stone-900">
                  <Navigation className="w-3 h-3 text-amber-700" />
                  <span>
                    Route Distance: <strong className="font-mono text-amber-900">{routeSummary.distanceKm} km</strong> (~{routeSummary.durationMins} mins drive)
                  </span>
                </div>
                <div className="text-[10px] text-stone-500 font-medium mt-0.5">
                  Google Maps
                </div>
              </div>
            ) : (
              <span className="text-stone-500">Enter your destination above to calculate route distance</span>
            )}
          </div>
          {routeSummary && !isCalculatingRoute && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              Auto-Calculated
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
