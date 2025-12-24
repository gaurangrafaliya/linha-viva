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

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const source = mapRef.current.getSource('buses') as maplibregl.GeoJSONSource;
    if (!source) return;

    const hasFilter = selectedLines.length > 0;
    const hasSelectedBus = selectedBus !== null;

    const features = positions.map(bus => {
      const routeId = tripsRef.current.get(bus.line);
      const route = routeId ? routesRef.current.get(routeId) : null;
      const routeColor = route?.color ? `#${route.color}` : BRAND_COLORS.primary;
      const isFiltered = !hasFilter || selectedLines.includes(bus.line);
      const isSelected = selectedBus !== null && bus.id === selectedBus.id;
      
      const feature = {
        type: 'Feature' as const,
        id: bus.id,
        properties: {
          id: bus.id,
          line: bus.line,
          bearing: bus.bearing || 0,
          color: routeColor,
          textColor: getLuminance(routeColor) > 0.7 ? '#000000' : '#ffffff',
          isFiltered,
          hasSelectedBus,
          isSelected
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [bus.longitude, bus.latitude]
        }
      };

      return feature;
    });

    source.setData({
      type: 'FeatureCollection',
      features
    });

    positions.forEach(bus => {
      mapRef.current?.setFeatureState(
        { source: 'buses', id: bus.id },
        { selected: false }
      );
    });

    if (selectedBus) {
      mapRef.current.setFeatureState(
        { source: 'buses', id: selectedBus.id },
        { selected: true }
      );
    }

    setTimeout(() => {
      if (!mapRef.current) return;
      
      const opacityExpression = [
        'case',
        ['get', 'isSelected'], 1,
        ['get', 'hasSelectedBus'], 0.3,
        ['boolean', ['get', 'isFiltered'], true], 1,
        0.15
      ] as any;

      if (mapRef.current.getLayer('bus-circles')) {
        mapRef.current.setPaintProperty('bus-circles', 'circle-opacity', opacityExpression);
        mapRef.current.setPaintProperty('bus-circles', 'circle-stroke-opacity', opacityExpression);
      }
      if (mapRef.current.getLayer('bus-labels')) {
        mapRef.current.setPaintProperty('bus-labels', 'text-opacity', opacityExpression);
      }
      if (mapRef.current.getLayer('bus-arrows')) {
        const arrowOpacityExpression = [
          'case',
          ['get', 'isSelected'], 0.8,
          ['get', 'hasSelectedBus'], 0.3,
          0.8
        ] as any;
        mapRef.current.setPaintProperty('bus-arrows', 'icon-opacity', arrowOpacityExpression);
      }

      mapRef.current.triggerRepaint();
    });
  }, [positions, isLoaded, selectedLines, selectedBus, mapRef, routesRef, tripsRef]);

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

