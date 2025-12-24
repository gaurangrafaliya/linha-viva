import { useEffect, useRef, MutableRefObject } from 'react';
import maplibregl from 'maplibre-gl';
import { BusPosition, SelectedBus } from '@/types/bus';
import { GTFSRoute, GTFSStop } from '@/types/gtfs';
import { BusDirection } from '@/enums/direction';
import { BRAND_COLORS } from '@/constants/colors';
import { calculateDistance } from '@/lib/geoUtils';
import { getLuminance } from '@/lib/utils';

export const useBusLayer = (
  mapRef: MutableRefObject<maplibregl.Map | null>,
  isLoaded: boolean,
  positions: BusPosition[],
  selectedBus: SelectedBus | null,
  selectedRouteId: string | null,
  selectedLines: string[],
  routeStops: { direction0: GTFSStop[], direction1: GTFSStop[] } | null,
  tripsRef: MutableRefObject<Map<string, string>>,
  routesRef: MutableRefObject<Map<string, GTFSRoute>>,
  isDashboardExpanded: boolean
) => {
  const positionsRef = useRef(positions);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  // Update GeoJSON source when positions or filters change
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const source = mapRef.current.getSource('buses') as maplibregl.GeoJSONSource;
    if (!source) return;

    const hasFilter = selectedLines.length > 0;

    const features = positions.map(bus => {
      const routeId = tripsRef.current.get(bus.line);
      const route = routeId ? routesRef.current.get(routeId) : null;
      const routeColor = route?.color ? `#${route.color}` : BRAND_COLORS.primary;
      const isFiltered = !hasFilter || selectedLines.includes(bus.line);
      
      return {
        type: 'Feature' as const,
        id: bus.id,
        properties: {
          id: bus.id,
          line: bus.line,
          bearing: bus.bearing || 0,
          color: routeColor,
          textColor: getLuminance(routeColor) > 0.7 ? '#000000' : '#ffffff',
          isFiltered
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [bus.longitude, bus.latitude]
        }
      };
    });

    source.setData({
      type: 'FeatureCollection',
      features
    });

    // Sync selected state
    if (selectedBus) {
      mapRef.current.setFeatureState(
        { source: 'buses', id: selectedBus.id },
        { selected: true }
      );
    }
  }, [positions, isLoaded, selectedLines, selectedBus, mapRef, routesRef, tripsRef]);

  // Center map on selected bus
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !selectedBus) return;

    const bus = positionsRef.current.find(p => p.id === selectedBus.id);
    if (bus) {
      mapRef.current.easeTo({
        center: [bus.longitude, bus.latitude],
        zoom: Math.max(mapRef.current.getZoom(), 15),
        duration: 1000,
        padding: { top: 0, bottom: 0, left: isDashboardExpanded ? 400 : 0, right: 0 }
      });

      mapRef.current.setFeatureState(
        { source: 'buses', id: bus.id },
        { selected: true }
      );
    }

    return () => {
      if (mapRef.current && selectedBus) {
        mapRef.current.setFeatureState(
          { source: 'buses', id: selectedBus.id },
          { selected: false }
        );
      }
    };
  }, [selectedBus?.id, isLoaded, isDashboardExpanded, mapRef]);

  // Helper for direction detection (though we don't return busDirections here yet, 
  // it could be added if needed by other components. In MapContainer it was used to set state)
  // Re-implementing the direction detection logic if needed by the caller
  const detectBusDirection = (bus: BusPosition): BusDirection | null => {
    if (!selectedRouteId || !routeStops) return null;
    if (tripsRef.current.get(bus.line) !== selectedRouteId) return null;

    const findNearest = (directionStops: GTFSStop[]) => {
      if (directionStops.length === 0) return { distance: Infinity };
      let minDist = Infinity;
      directionStops.forEach(stop => {
        const dist = calculateDistance(bus.latitude, bus.longitude, stop.lat, stop.lng);
        if (dist < minDist) minDist = dist;
      });
      return { distance: minDist };
    };

    const d0 = findNearest(routeStops.direction0);
    const d1 = findNearest(routeStops.direction1);

    return d1.distance < d0.distance ? BusDirection.INBOUND : BusDirection.OUTBOUND;
  };

  return { detectBusDirection };
};

