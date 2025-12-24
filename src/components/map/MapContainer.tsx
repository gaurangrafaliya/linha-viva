import { useRef, memo } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAppContext } from '@/context/AppContext';
import { useMapMetadata } from '@/hooks/map/useMapMetadata';
import { useRouteLayer } from '@/hooks/map/useRouteLayer';
import { useBusLayer } from '@/hooks/map/useBusLayer';
import { useMapInteractions } from '@/hooks/map/useMapInteractions';
import { useMapInstance } from '@/hooks/map/useMapInstance';
import { MapZoomControls } from '@/components/map/MapZoomControls';

export const MapContainer = memo(() => {
  const {
    positions,
    selectedBus,
    selectedRouteId,
    handleBusSelect,
    isDashboardExpanded,
    activeDirection,
    selectedLines,
    mapStyle
  } = useAppContext();

  const mapContainer = useRef<HTMLDivElement>(null);

  // Initialize map instance and base layers
  const { mapRef, isLoaded } = useMapInstance(mapContainer, mapStyle);

  // Initialize metadata refs
  const { routesRef, tripsRef } = useMapMetadata();

  // Hook into route layer management
  const { routeStops } = useRouteLayer(
    mapRef,
    isLoaded,
    selectedRouteId,
    activeDirection,
    isDashboardExpanded,
    routesRef
  );

  // Hook into bus layer management
  useBusLayer(
    mapRef,
    isLoaded,
    positions,
    selectedBus,
    selectedRouteId,
    selectedLines,
    routeStops,
    tripsRef,
    routesRef,
    isDashboardExpanded
  );

  // Hook into map interactions
  useMapInteractions(mapRef, isLoaded, tripsRef, handleBusSelect);

  return (
    <div className="absolute inset-0 w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Map Overlay for better contrast with UI */}
      <div className="absolute inset-0 pointer-events-none bg-linear-to-r from-black/5 via-transparent to-transparent" />
      
      <MapZoomControls mapRef={mapRef} />
    </div>
  );
});

MapContainer.displayName = 'MapContainer';
