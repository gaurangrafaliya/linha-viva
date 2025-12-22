import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useBusPositions } from '@/hooks/useBusPositions';
import { useInterpolation } from '@/hooks/useInterpolation';
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
  useInterpolation(mapRef.current, positions);

  const addBusesLayer = useCallback((map: maplibregl.Map) => {
    if (map.getSource('buses')) return;

    map.addSource('buses', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });

    map.addLayer({
      id: 'buses-layer',
      type: 'circle',
      source: 'buses',
      paint: {
        'circle-radius': [
          'case',
          ['==', ['get', 'line'], selectedRouteId || ''],
          10,
          6
        ],
        'circle-color': [
          'case',
          ['==', ['get', 'line'], selectedRouteId || ''],
          '#ffffff',
          BRAND_COLORS.primary
        ],
        'circle-stroke-width': [
          'case',
          ['==', ['get', 'line'], selectedRouteId || ''],
          4,
          2
        ],
        'circle-stroke-color': [
          'case',
          ['==', ['get', 'line'], selectedRouteId || ''],
          BRAND_COLORS.primary,
          '#ffffff'
        ]
      }
    });
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
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && isLoaded) {
      mapRef.current.setPaintProperty('buses-layer', 'circle-radius', [
        'case',
        ['==', ['get', 'line'], selectedRouteId || ''],
        10,
        6
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

  useEffect(() => {
    if (mapRef.current && isLoaded) {
      mapRef.current.setStyle(styleUrl);
    }
  }, [styleUrl, isLoaded]);

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

