import { useEffect, useRef, useState, useCallback, memo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useBusPositions } from '@/hooks/useBusPositions';
import { MapStyleUrl, Theme } from '@/constants/mapStyles';
import { BRAND_COLORS } from '@/constants/colors';
import { cn } from '@/lib/utils';
import { gtfsService } from '@/services/gtfsService';
import { GTFSRoute, GTFSStop } from '@/types/gtfs';
import { BusPosition } from '@/types/bus';

const PORTO_CENTER: [number, number] = [-8.6291, 41.1579];
const INITIAL_ZOOM = 13;
const MIN_ZOOM = 11.5;
const PORTO_BOUNDS: [[number, number], [number, number]] = [
  [-8.78, 41.05], // Southwest coordinates
  [-8.4, 41.275]  // Northeast coordinates
];

interface SelectedBus {
  id: string;
  line: string;
  routeId: string | null;
}

interface MapContainerProps {
  styleUrl: MapStyleUrl;
  onSelectBus: (bus: SelectedBus | null) => void;
  selectedBus: SelectedBus | null;
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string | null) => void;
  isDashboardExpanded: boolean;
  activeDirection?: 0 | 1;
}

const luminanceCache = new Map<string, number>();
const getLuminance = (hex: string) => {
  if (!hex || hex.length < 7) return 0;
  if (luminanceCache.has(hex)) return luminanceCache.get(hex)!;
  
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  luminanceCache.set(hex, lum);
  return lum;
};

// Distance calculation helper
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const MapContainer = memo(({ 
  styleUrl, 
  onSelectBus, 
  selectedBus, 
  selectedRouteId,
  onSelectRoute, 
  isDashboardExpanded, 
  activeDirection = 0 
}: MapContainerProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { positions } = useBusPositions();
  const positionsRef = useRef(positions);
  const routesRef = useRef<Map<string, GTFSRoute>>(new Map());
  const tripsRef = useRef<Map<string, string>>(new Map()); // line -> routeId
  const selectedBusRef = useRef<SelectedBus | null>(null);
  const selectedRouteIdRef = useRef<string | null>(null);
  const [currentRouteData, setCurrentRouteData] = useState<{
    coordinates: [number, number][];
    routeColor: string;
  } | null>(null);
  const [busDirections, setBusDirections] = useState<Map<string, 0 | 1>>(new Map());
  const [routeStops, setRouteStops] = useState<{ direction0: GTFSStop[], direction1: GTFSStop[] } | null>(null);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  useEffect(() => {
    selectedBusRef.current = selectedBus;
  }, [selectedBus]);

  useEffect(() => {
    selectedRouteIdRef.current = selectedRouteId;
  }, [selectedRouteId]);

  // Load route stops when selected route changes
  useEffect(() => {
    if (!selectedRouteId) {
      setRouteStops(null);
      return;
    }

    const loadStops = async () => {
      const stops = await gtfsService.fetchStopsForRoute(selectedRouteId);
      setRouteStops(stops);
    };
    loadStops();
  }, [selectedRouteId]);

  // Detect directions for all buses on the selected route
  useEffect(() => {
    if (!selectedRouteId || !routeStops || positions.length === 0) {
      setBusDirections(new Map());
      return;
    }

    const busesOnRoute = positions.filter(p => {
      const routeId = tripsRef.current.get(p.line);
      return routeId === selectedRouteId;
    });

    if (busesOnRoute.length === 0) {
      setBusDirections(new Map());
      return;
    }

    const newDirections = new Map<string, 0 | 1>();
    
    busesOnRoute.forEach(bus => {
      const findNearest = (directionStops: GTFSStop[]) => {
        if (directionStops.length === 0) return { index: -1, distance: Infinity };
        let minDist = Infinity;
        let nearestIdx = 0;
        directionStops.forEach((stop, idx) => {
          const dist = calculateDistance(bus.latitude, bus.longitude, stop.lat, stop.lng);
          if (dist < minDist) {
            minDist = dist;
            nearestIdx = idx;
          }
        });
        return { index: nearestIdx, distance: minDist };
      };

      const d0 = findNearest(routeStops.direction0);
      const d1 = findNearest(routeStops.direction1);

      if (routeStops.direction1.length === 0) {
        newDirections.set(bus.id, 0);
        return;
      }
      if (routeStops.direction0.length === 0) {
        newDirections.set(bus.id, 1);
        return;
      }

      let direction: 0 | 1 = 0;
      if (bus.bearing !== undefined && bus.bearing !== null) {
        const checkAlignment = (directionStops: GTFSStop[], nearestIdx: number) => {
          if (nearestIdx < 0 || nearestIdx >= directionStops.length - 1) return false;
          const nextStop = directionStops[nearestIdx + 1];
          let bearingToNext = Math.atan2(nextStop.lng - bus.longitude, nextStop.lat - bus.latitude) * 180 / Math.PI;
          if (bearingToNext < 0) bearingToNext += 360;
          const bearingDiff = Math.abs(bearingToNext - bus.bearing!);
          return (bearingDiff < 60 || bearingDiff > 300);
        };

        const d0Aligned = checkAlignment(routeStops.direction0, d0.index);
        const d1Aligned = checkAlignment(routeStops.direction1, d1.index);

        if (d1Aligned && !d0Aligned) {
          direction = 1;
        } else if (d0Aligned && !d1Aligned) {
          direction = 0;
        } else {
          direction = d1.distance < d0.distance ? 1 : 0;
        }
      } else {
        direction = d1.distance < d0.distance ? 1 : 0;
      }
      newDirections.set(bus.id, direction);
    });

    setBusDirections(newDirections);
  }, [selectedRouteId, routeStops, positions]);

  const addBusesLayer = useCallback((map: maplibregl.Map) => {
    if (!map.getSource('buses')) {
      map.addSource('buses', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });
    }

    if (!map.getSource('route-line-traveled')) {
      map.addSource('route-line-traveled', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });
    }

    if (!map.getSource('route-line-remaining')) {
      map.addSource('route-line-remaining', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });
    }

    if (!map.getLayer('route-line-traveled')) {
      map.addLayer({
        id: 'route-line-traveled',
        type: 'line',
        source: 'route-line-traveled',
        paint: {
          'line-color': BRAND_COLORS.primary,
          'line-width': 4,
          'line-opacity': 1
        }
      });
    }

    if (!map.getLayer('route-line-remaining')) {
      map.addLayer({
        id: 'route-line-remaining',
        type: 'line',
        source: 'route-line-remaining',
        paint: {
          'line-color': BRAND_COLORS.primary,
          'line-width': 4,
          'line-opacity': 0.3
        }
      });
    }

    if (!map.getLayer('buses-layer')) {
      map.addLayer({
        id: 'buses-layer',
        type: 'circle',
        source: 'buses',
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'id'], selectedBusRef.current?.id || ''],
            14,
            9
          ],
          'circle-color': ['get', 'routeColor'],
          'circle-opacity': 1,
          'circle-stroke-width': [
            'case',
            ['==', ['get', 'id'], selectedBusRef.current?.id || ''],
            3,
            0.8
          ],
          'circle-stroke-color': [
            'case',
            ['==', ['get', 'id'], selectedBusRef.current?.id || ''],
            '#ffffff',
            'rgba(0,0,0,0.1)'
          ]
        }
      });
    }

    if (!map.getLayer('buses-labels')) {
      map.addLayer({
        id: 'buses-labels',
        type: 'symbol',
        source: 'buses',
        layout: {
          'text-field': ['get', 'line'],
          'text-font': ['Noto Sans Bold', 'Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': [
            'case',
            ['==', ['get', 'id'], selectedBusRef.current?.id || ''],
            10,
            7.5
          ],
          'text-anchor': 'center',
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'symbol-sort-key': ['get', 'sortKey']
        },
        paint: {
          'text-color': ['get', 'routeTextColor'],
          'text-opacity': 1,
          'text-halo-color': '#ffffff',
          'text-halo-width': [
            'case',
            ['==', ['get', 'routeTextColor'], '#000000'],
            1,
            0
          ],
        }
      });
    }
  }, []);

  const updateSource = useCallback(() => {
    if (!mapRef.current || !isLoaded) return;
    const map = mapRef.current;
    
    let source = map.getSource('buses') as maplibregl.GeoJSONSource;
    if (!source) {
      addBusesLayer(map);
      source = map.getSource('buses') as maplibregl.GeoJSONSource;
      if (!source) return;
    }

    const geoJsonData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: positions.map(bus => {
        const route = routesRef.current.get(bus.line);
        const routeColor = route?.color ? `#${route.color}` : BRAND_COLORS.primary;
        const isLight = getLuminance(routeColor) > 0.7;
        const routeTextColor = isLight ? '#000000' : '#ffffff';
        const isSelected = bus.id === selectedBus?.id;
        const routeId = tripsRef.current.get(bus.line) || null;
        const isOnSelectedRoute = !!selectedRouteId && routeId === selectedRouteId;
        const busDirection = busDirections.get(bus.id);
        const isOnSelectedDirection = isOnSelectedRoute && (busDirection === undefined || busDirection === activeDirection);
        
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [bus.longitude, bus.latitude],
          },
          properties: {
            id: bus.id,
            line: bus.line,
            operator: bus.operator,
            bearing: bus.bearing,
            speed: bus.speed,
            routeColor,
            routeTextColor,
            routeId,
            isOnSelectedRoute,
            isOnSelectedDirection,
            sortKey: isSelected ? 3 : (isOnSelectedDirection ? 2 : 1)
          },
        };
      }),
    };

    source.setData(geoJsonData);
  }, [positions, isLoaded, addBusesLayer, selectedRouteId, selectedBus, busDirections, activeDirection]);

  // Load route data when selected route or direction changes
  useEffect(() => {
    if (!selectedRouteId) {
      setCurrentRouteData(null);
      return;
    }

    const loadRouteData = async () => {
      const routeId = selectedRouteId!;
      const [bestTrips, route] = await Promise.all([
        gtfsService.fetchRepresentativeTrips(routeId),
        gtfsService.fetchRoutes().then(routes => routes.find(r => r.id === routeId))
      ]);
      
      // Use the representative trip for the active direction
      const trip = activeDirection === 0 ? bestTrips.direction0 : bestTrips.direction1;
      const finalTrip = trip || bestTrips.direction0 || bestTrips.direction1;
      
      if (!finalTrip?.shapeId) return;

      const shapes = await gtfsService.fetchShape(finalTrip.shapeId);
      if (shapes.length === 0) return;

      const coordinates = shapes.map(s => [s.lng, s.lat] as [number, number]);
      const routeColor = route?.color ? `#${route.color}` : BRAND_COLORS.primary;

      setCurrentRouteData({ coordinates, routeColor });
    };

    loadRouteData();
  }, [selectedRouteId, activeDirection]);

  useEffect(() => {
    const loadRoutes = async () => {
      const [routes, trips] = await Promise.all([
        gtfsService.fetchRoutes(),
        gtfsService.fetchAllTrips()
      ]);
      
      const routeMap = new Map<string, GTFSRoute>();
      routes.forEach(route => {
        routeMap.set(route.shortName, route);
      });
      routesRef.current = routeMap;

      const lineToRouteMap = new Map<string, string>();
      trips.forEach(trip => {
        const route = routes.find(r => r.id === trip.routeId);
        if (route) {
          lineToRouteMap.set(route.shortName, trip.routeId);
        }
      });
      tripsRef.current = lineToRouteMap;
    };
    loadRoutes();
  }, []);

  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;

    mapRef.current = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: PORTO_CENTER,
      zoom: INITIAL_ZOOM,
      minZoom: MIN_ZOOM,
      maxBounds: PORTO_BOUNDS,
    });

    const map = mapRef.current;

    map.on('load', () => {
      setIsLoaded(true);
      addBusesLayer(map);

      // Add click handler for buses
      map.on('click', 'buses-layer', (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const busId = feature.properties?.id;
          const line = feature.properties?.line;
          if (busId && line) {
            const routeId = tripsRef.current.get(line) || null;
            onSelectBus({ id: busId, line, routeId });
          }
        }
      });

      map.on('click', 'buses-labels', (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const busId = feature.properties?.id;
          const line = feature.properties?.line;
          if (busId && line) {
            const routeId = tripsRef.current.get(line) || null;
            onSelectBus({ id: busId, line, routeId });
          }
        }
      });

      // Change cursor on hover
      map.on('mouseenter', 'buses-layer', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'buses-layer', () => {
        map.getCanvas().style.cursor = '';
      });

      map.on('mouseenter', 'buses-labels', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'buses-labels', () => {
        map.getCanvas().style.cursor = '';
      });
    });

    map.on('style.load', () => {
      addBusesLayer(map);
      updateSource();
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [styleUrl]);

  const lastCenteredBusIdRef = useRef<string | null>(null);
  const lastCenteredPosRef = useRef<[number, number] | null>(null);

  // Update bus styling and center map when selection or positions change
  useEffect(() => {
    if (mapRef.current && isLoaded) {
      const selectedId = selectedBus?.id || '';
      const hasSelection = !!selectedBus;
      const hasRouteSelection = !!selectedRouteId;
      
      mapRef.current.setPaintProperty('buses-layer', 'circle-radius', [
        'case',
        ['==', ['get', 'id'], selectedId],
        14,
        ['get', 'isOnSelectedDirection'],
        11,
        9
      ]);
      mapRef.current.setPaintProperty('buses-layer', 'circle-opacity', [
        'case',
        ['==', ['get', 'id'], selectedId],
        1,
        ['get', 'isOnSelectedDirection'],
        1,
        hasSelection || hasRouteSelection ? 0.3 : 1
      ]);
      mapRef.current.setPaintProperty('buses-layer', 'circle-stroke-width', [
        'case',
        ['==', ['get', 'id'], selectedId],
        3,
        ['get', 'isOnSelectedDirection'],
        1.5,
        0.8
      ]);
      
      if (mapRef.current.getLayer('buses-labels')) {
        mapRef.current.setLayoutProperty('buses-labels', 'text-size', [
          'case',
          ['==', ['get', 'id'], selectedId],
          10,
          ['get', 'isOnSelectedDirection'],
          8.5,
          7.5
        ]);
        mapRef.current.setPaintProperty('buses-labels', 'text-opacity', [
          'case',
          ['==', ['get', 'id'], selectedId],
          1,
          ['get', 'isOnSelectedDirection'],
          1,
          hasSelection || hasRouteSelection ? 0.3 : 1
        ]);
      }

      // Center map on selected bus or fit to route bounds
      if (selectedBus) {
        const busPos = positions.find(p => p.id === selectedBus.id);
        if (busPos) {
          const newPos: [number, number] = [busPos.longitude, busPos.latitude];
          const isNewBus = lastCenteredBusIdRef.current !== selectedBus.id;
          
          // Only center if it's a new bus selection or the bus has moved significantly (> 10 meters)
          let shouldCenter = isNewBus;
          if (!isNewBus && lastCenteredPosRef.current) {
            const dist = calculateDistance(lastCenteredPosRef.current[1], lastCenteredPosRef.current[0], newPos[1], newPos[0]);
            if (dist > 10) shouldCenter = true;
          }

          if (shouldCenter) {
            mapRef.current.easeTo({
              center: newPos,
              zoom: Math.max(mapRef.current.getZoom(), 15),
              duration: 1000,
              padding: {
                left: isDashboardExpanded ? 400 : 0,
                right: 0,
                top: 0,
                bottom: 0
              },
              essential: true
            });
            lastCenteredBusIdRef.current = selectedBus.id;
            lastCenteredPosRef.current = newPos;
          }
        }
      } else if (selectedRouteId && currentRouteData?.coordinates.length) {
        // Fit to route bounds if no specific bus is selected but a route is
        const coordinates = currentRouteData.coordinates;
        const bounds = coordinates.reduce((acc, coord) => {
          return [
            [Math.min(acc[0][0], coord[0]), Math.min(acc[0][1], coord[1])],
            [Math.max(acc[1][0], coord[0]), Math.max(acc[1][1], coord[1])]
          ];
        }, [[coordinates[0][0], coordinates[0][1]], [coordinates[0][0], coordinates[0][1]]]);

        mapRef.current.fitBounds(bounds as [[number, number], [number, number]], {
          padding: {
            left: isDashboardExpanded ? 450 : 50,
            right: 50,
            top: 50,
            bottom: 50
          },
          duration: 1000,
          essential: true
        });
        lastCenteredBusIdRef.current = null;
        lastCenteredPosRef.current = null;
      } else {
        lastCenteredBusIdRef.current = null;
        lastCenteredPosRef.current = null;
      }
    }
  }, [selectedBus?.id, selectedRouteId, currentRouteData, positions, isLoaded, isDashboardExpanded]);

  // Update route line for selected route
  useEffect(() => {
    if (!mapRef.current || !isLoaded || !currentRouteData) {
      const traveledSource = mapRef.current?.getSource('route-line-traveled') as maplibregl.GeoJSONSource;
      const remainingSource = mapRef.current?.getSource('route-line-remaining') as maplibregl.GeoJSONSource;
      if (traveledSource) traveledSource.setData({ type: 'FeatureCollection', features: [] });
      if (remainingSource) remainingSource.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    const { coordinates, routeColor } = currentRouteData;
    const traveledSource = mapRef.current.getSource('route-line-traveled') as maplibregl.GeoJSONSource;
    const remainingSource = mapRef.current.getSource('route-line-remaining') as maplibregl.GeoJSONSource;

    if (!traveledSource || !remainingSource) return;

    // If no bus is selected, show the whole line as remaining
    if (!selectedBus) {
      traveledSource.setData({ type: 'FeatureCollection', features: [] });
      remainingSource.setData({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'LineString', coordinates },
          properties: {}
        }]
      });
      mapRef.current.setPaintProperty('route-line-remaining', 'line-color', routeColor);
      mapRef.current.setPaintProperty('route-line-remaining', 'line-opacity', 0.8);
      return;
    }

    const busPosition = positions.find(b => b.id === selectedBus.id);
    if (!busPosition) {
      // Fallback to showing whole line if bus position is not found
      traveledSource.setData({ type: 'FeatureCollection', features: [] });
      remainingSource.setData({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'LineString', coordinates },
          properties: {}
        }]
      });
      mapRef.current.setPaintProperty('route-line-remaining', 'line-color', routeColor);
      mapRef.current.setPaintProperty('route-line-remaining', 'line-opacity', 0.8);
      return;
    }

    // Find the closest point on the route to the bus
    let closestIndex = 0;
    let minDistance = Infinity;
    
    coordinates.forEach((coord, index) => {
      const distance = calculateDistance(busPosition.latitude, busPosition.longitude, coord[1], coord[0]);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    // Find which segment the bus is on
    let segmentIndex = closestIndex;
    if (closestIndex > 0 && closestIndex < coordinates.length - 1) {
      const distPrevToBus = calculateDistance(coordinates[closestIndex - 1][1], coordinates[closestIndex - 1][0], busPosition.latitude, busPosition.longitude);
      const distPrevToClosest = calculateDistance(coordinates[closestIndex - 1][1], coordinates[closestIndex - 1][0], coordinates[closestIndex][1], coordinates[closestIndex][0]);
      if (distPrevToBus < distPrevToClosest) segmentIndex = closestIndex - 1;
    } else if (closestIndex === coordinates.length - 1 && coordinates.length > 1) {
      segmentIndex = closestIndex - 1;
    }

    const traveledCoordinates = [...coordinates.slice(0, segmentIndex + 1), [busPosition.longitude, busPosition.latitude] as [number, number]];
    const remainingCoordinates = [[busPosition.longitude, busPosition.latitude] as [number, number], ...coordinates.slice(segmentIndex + 1)];

    traveledSource.setData({
      type: 'FeatureCollection',
      features: traveledCoordinates.length > 1 ? [{
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: traveledCoordinates },
        properties: {}
      }] : []
    });

    remainingSource.setData({
      type: 'FeatureCollection',
      features: remainingCoordinates.length > 1 ? [{
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: remainingCoordinates },
        properties: {}
      }] : []
    });

    mapRef.current.setPaintProperty('route-line-traveled', 'line-color', routeColor);
    mapRef.current.setPaintProperty('route-line-traveled', 'line-opacity', 1);
    mapRef.current.setPaintProperty('route-line-remaining', 'line-color', routeColor);
    mapRef.current.setPaintProperty('route-line-remaining', 'line-opacity', 0.3);
  }, [selectedBus?.id, currentRouteData, positions, isLoaded]);

  const currentStyleUrlRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (currentStyleUrlRef.current === null) {
      currentStyleUrlRef.current = styleUrl;
    }
  }, [styleUrl]);
  
  useEffect(() => {
    if (mapRef.current && isLoaded && currentStyleUrlRef.current !== styleUrl) {
      currentStyleUrlRef.current = styleUrl;
      mapRef.current.setStyle(styleUrl);
    }
  }, [styleUrl, isLoaded]);

  useEffect(() => {
    if (!mapRef.current || !isLoaded) {
      return;
    }

    updateSource();
  }, [updateSource, isLoaded]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="w-full h-full" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center transition-colors duration-500 z-20 bg-white">
          <div className="flex flex-col items-center gap-3">
            <div 
              className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: `${BRAND_COLORS.primary} transparent ${BRAND_COLORS.primary} ${BRAND_COLORS.primary}` }}
            ></div>
            <p className="font-medium text-neutral-900">Loading Porto map...</p>
          </div>
        </div>
      )}
    </div>
  );
});
