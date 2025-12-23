import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useBusPositions } from '@/hooks/useBusPositions';
import { MapStyleUrl, Theme } from '@/constants/mapStyles';
import { BRAND_COLORS } from '@/constants/colors';
import { cn } from '@/lib/utils';

const PORTO_CENTER: [number, number] = [-8.6291, 41.1579];
const INITIAL_ZOOM = 13;
const MIN_ZOOM = 11.5;
const PORTO_BOUNDS: [[number, number], [number, number]] = [
  [-8.78, 41.05], // Southwest coordinates
  [-8.45, 41.25]  // Northeast coordinates
];

interface MapContainerProps {
  styleUrl: MapStyleUrl;
  onSelectRoute: (routeId: string | null) => void;
  selectedRouteId: string | null;
  theme: Theme;
}

export const MapContainer = ({ styleUrl, onSelectRoute, selectedRouteId, theme }: MapContainerProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { positions } = useBusPositions();
  const positionsRef = useRef(positions);
  
  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  const selectedRouteIdRef = useRef(selectedRouteId);
  useEffect(() => {
    selectedRouteIdRef.current = selectedRouteId;
  }, [selectedRouteId]);

  const addBusesLayer = useCallback((map: maplibregl.Map) => {
    if (map.getSource('buses')) return;

    map.addSource('buses', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });

    if (!map.getLayer('buses-layer')) {
      const currentRouteId = selectedRouteIdRef.current;
      map.addLayer({
        id: 'buses-layer',
        type: 'circle',
        source: 'buses',
        paint: {
        'circle-radius': [
          'case',
          ['==', ['get', 'line'], currentRouteId || ''],
          12,
          8
        ],
          'circle-color': [
            'case',
            ['==', ['get', 'line'], currentRouteId || ''],
            '#ffffff',
            BRAND_COLORS.primary
          ],
          'circle-stroke-width': [
            'case',
            ['==', ['get', 'line'], currentRouteId || ''],
            4,
            2
          ],
          'circle-stroke-color': [
            'case',
            ['==', ['get', 'line'], currentRouteId || ''],
            BRAND_COLORS.primary,
            '#ffffff'
          ]
        }
      });
    }
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
          const line = feature.properties?.line;
          if (line) {
            onSelectRoute(line);
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
    });

    map.on('style.load', () => {
      addBusesLayer(map);
      const currentPositions = positionsRef.current;
      if (currentPositions.length > 0) {
        const source = map.getSource('buses') as maplibregl.GeoJSONSource;
        if (source) {
          const geoJsonData: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: currentPositions.map(bus => ({
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
              },
            })),
          };
          source.setData(geoJsonData);
        }
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [styleUrl]);

  useEffect(() => {
    if (mapRef.current && isLoaded) {
      mapRef.current.setPaintProperty('buses-layer', 'circle-radius', [
        'case',
        ['==', ['get', 'line'], selectedRouteId || ''],
        12,
        8
      ]);
      mapRef.current.setPaintProperty('buses-layer', 'circle-color', [
        'case',
        ['==', ['get', 'line'], selectedRouteId || ''],
        '#ffffff',
        BRAND_COLORS.primary
      ]);
      mapRef.current.setPaintProperty('buses-layer', 'circle-stroke-width', [
        'case',
        ['==', ['get', 'line'], selectedRouteId || ''],
        4,
        2
      ]);
      mapRef.current.setPaintProperty('buses-layer', 'circle-stroke-color', [
        'case',
        ['==', ['get', 'line'], selectedRouteId || ''],
        BRAND_COLORS.primary,
        '#ffffff'
      ]);
    }
  }, [selectedRouteId, isLoaded]);

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

    const map = mapRef.current;
    
    const updateSource = () => {
      let source = map.getSource('buses') as maplibregl.GeoJSONSource;
      if (!source) {
        addBusesLayer(map);
        source = map.getSource('buses') as maplibregl.GeoJSONSource;
        if (!source) return;
      }

      const geoJsonData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: positions.map(bus => ({
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
          },
        })),
      };

      source.setData(geoJsonData);
    };

    updateSource();
  }, [positions, isLoaded, addBusesLayer]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="w-full h-full" />
      {!isLoaded && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center transition-colors duration-500 z-20",
          theme === 'dark' ? "bg-neutral-950" : "bg-white"
        )}>
          <div className="flex flex-col items-center gap-3">
            <div 
              className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: `${BRAND_COLORS.primary} transparent ${BRAND_COLORS.primary} ${BRAND_COLORS.primary}` }}
            ></div>
            <p className={cn(
              "font-medium",
              theme === 'dark' ? "text-white" : "text-neutral-900"
            )}>Loading Porto map...</p>
          </div>
        </div>
      )}
    </div>
  );
};

