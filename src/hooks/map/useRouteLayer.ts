import { useEffect, useState, MutableRefObject } from 'react';
import maplibregl from 'maplibre-gl';
import { gtfsService } from '@/services/gtfsService';
import { GTFSRoute, GTFSStop } from '@/types/gtfs';
import { BusDirection } from '@/enums/direction';
import { BRAND_COLORS } from '@/constants/colors';

export const useRouteLayer = (
  mapRef: MutableRefObject<maplibregl.Map | null>,
  isLoaded: boolean,
  selectedRouteId: string | null,
  activeDirection: BusDirection,
  isDashboardExpanded: boolean,
  routesRef: MutableRefObject<Map<string, GTFSRoute>>
) => {
  const [currentRouteData, setCurrentRouteData] = useState<{
    coordinates: [number, number][];
    routeColor: string;
  } | null>(null);
  const [routeStops, setRouteStops] = useState<{ direction0: GTFSStop[], direction1: GTFSStop[] } | null>(null);

  // Load route data when selectedRouteId or activeDirection changes
  useEffect(() => {
    if (!selectedRouteId) {
      setCurrentRouteData(null);
      setRouteStops(null);
      return;
    }

    const loadRouteData = async () => {
      try {
        const [stopsData, tripsData] = await Promise.all([
          gtfsService.fetchStopsForRoute(selectedRouteId),
          gtfsService.fetchRepresentativeTrips(selectedRouteId)
        ]);
        
        setRouteStops(stopsData);
        
        const activeTrip = activeDirection === BusDirection.OUTBOUND ? tripsData.direction0 : tripsData.direction1;
        
        if (activeTrip?.shapeId) {
          const shape = await gtfsService.fetchShape(activeTrip.shapeId);
          const route = routesRef.current.get(selectedRouteId);
          
          setCurrentRouteData({
            coordinates: shape.map(p => [p.lng, p.lat] as [number, number]),
            routeColor: route?.color ? `#${route.color}` : BRAND_COLORS.primary
          });
        }
      } catch (error) {
        console.error('Error loading route data:', error);
      }
    };

    loadRouteData();
  }, [selectedRouteId, activeDirection, routesRef]);

  // Update route path source on map
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const source = mapRef.current.getSource('route-path') as maplibregl.GeoJSONSource;
    if (!source) return;

    if (currentRouteData) {
      source.setData({
        type: 'Feature',
        properties: { color: currentRouteData.routeColor },
        geometry: {
          type: 'LineString',
          coordinates: currentRouteData.coordinates
        }
      });

      // Fit map to route
      const bounds = new maplibregl.LngLatBounds();
      currentRouteData.coordinates.forEach(coord => bounds.extend(coord));
      
      mapRef.current.fitBounds(bounds, {
        padding: { top: 100, bottom: 100, left: isDashboardExpanded ? 450 : 100, right: 100 },
        maxZoom: 16,
        duration: 1000
      });
    } else {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: [] }
      });
    }
  }, [currentRouteData, isLoaded, isDashboardExpanded, mapRef]);

  // Update stops source on map
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const source = mapRef.current.getSource('route-stops') as maplibregl.GeoJSONSource;
    if (!source) return;

    if (routeStops) {
      const currentStops = activeDirection === BusDirection.OUTBOUND ? routeStops.direction0 : routeStops.direction1;
      source.setData({
        type: 'FeatureCollection',
        features: currentStops.map(stop => ({
          type: 'Feature',
          properties: { id: stop.id, name: stop.name },
          geometry: {
            type: 'Point',
            coordinates: [stop.lng, stop.lat]
          }
        }))
      });
    } else {
      source.setData({
        type: 'FeatureCollection',
        features: []
      });
    }
  }, [routeStops, activeDirection, isLoaded, mapRef]);

  return { routeStops };
};

