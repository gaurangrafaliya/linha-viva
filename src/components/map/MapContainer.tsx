import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useBusPositions } from '@/hooks/useBusPositions';
import { useInterpolation } from '@/hooks/useInterpolation';
import { MapStyleUrl } from '@/constants/mapStyles';
import { BRAND_COLORS } from '@/constants/colors';

const PORTO_CENTER: [number, number] = [-8.6291, 41.1579];
const INITIAL_ZOOM = 13;
const MIN_ZOOM = 11.5;
const PORTO_BOUNDS: [[number, number], [number, number]] = [
  [-8.78, 41.05], // Southwest coordinates
  [-8.45, 41.25]  // Northeast coordinates
];

interface MapContainerProps {
  styleUrl: MapStyleUrl;
}

export const MapContainer = ({ styleUrl }: MapContainerProps) => {
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
        'circle-radius': 6,
        'circle-color': BRAND_COLORS.primary,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
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
      mapRef.current.setStyle(styleUrl);
    }
  }, [styleUrl, isLoaded]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="w-full h-full" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-neutral-900 transition-colors duration-500 z-20">
          <div className="flex flex-col items-center gap-3">
            <div 
              className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: `${BRAND_COLORS.primary} transparent ${BRAND_COLORS.primary} ${BRAND_COLORS.primary}` }}
            ></div>
            <p className="text-neutral-900 dark:text-white font-medium">Loading Porto map...</p>
          </div>
        </div>
      )}
    </div>
  );
};

