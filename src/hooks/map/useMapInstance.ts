import { useEffect, useRef, useState, MutableRefObject } from 'react';
import maplibregl from 'maplibre-gl';

const PORTO_CENTER: [number, number] = [-8.6291, 41.1579];
const INITIAL_ZOOM = 13;
const MIN_ZOOM = 11.5;
const PORTO_BOUNDS: [[number, number], [number, number]] = [
  [-8.85, 41.05],
  [-8.4, 41.275]
];

export const useMapInstance = (
  containerRef: MutableRefObject<HTMLDivElement | null>,
  mapStyle: string
) => {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: PORTO_CENTER,
      zoom: INITIAL_ZOOM,
      minZoom: MIN_ZOOM,
      maxBounds: PORTO_BOUNDS,
      attributionControl: false
    });

    mapRef.current = map;

    map.on('load', () => {
      // Add sources
      map.addSource('buses', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        generateId: true
      });

      map.addSource('route-path', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [] }
        }
      });

      map.addSource('route-stops', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      // Add layers
      map.addLayer({
        id: 'route-path-line',
        type: 'line',
        source: 'route-path',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 4,
          'line-opacity': 0.8
        }
      });

      map.addLayer({
        id: 'route-path-glow',
        type: 'line',
        source: 'route-path',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 8,
          'line-opacity': 0.2
        }
      }, 'route-path-line');

      map.addLayer({
        id: 'route-stops-points',
        type: 'circle',
        source: 'route-stops',
        paint: {
          'circle-radius': 4,
          'circle-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#4B5563'
        }
      });

      map.addLayer({
        id: 'bus-circles',
        type: 'circle',
        source: 'buses',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 14, 16, 20],
          'circle-color': ['get', 'color'],
          'circle-stroke-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 4,
            ['boolean', ['feature-state', 'hover'], false], 2,
            0
          ],
          'circle-stroke-color': '#000000',
          'circle-opacity': [
            'case',
            ['get', 'isSelected'], 1,
            ['get', 'hasSelectedBus'], 0.3,
            1
          ],
          'circle-stroke-opacity': [
            'case',
            ['get', 'isSelected'], 1,
            ['get', 'hasSelectedBus'], 0.3,
            1
          ]
        }
      });

      map.addLayer({
        id: 'bus-labels',
        type: 'symbol',
        source: 'buses',
        layout: {
          'text-field': ['get', 'line'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10, 16, 12],
          'text-allow-overlap': true,
          'text-ignore-placement': true
        },
        paint: {
          'text-color': ['get', 'textColor'],
          'text-opacity': [
            'case',
            ['get', 'isSelected'], 1,
            ['get', 'hasSelectedBus'], 0.3,
            1
          ]
        }
      });

      map.addLayer({
        id: 'bus-arrows',
        type: 'symbol',
        source: 'buses',
        layout: {
          'icon-image': 'rocket',
          'icon-rotate': ['get', 'bearing'],
          'icon-size': 0.5,
          'icon-allow-overlap': true
        },
        paint: {
          'icon-opacity': [
            'case',
            ['get', 'isSelected'], 0.8,
            ['get', 'hasSelectedBus'], 0.3,
            0.8
          ]
        }
      });

      setIsLoaded(true);
    });

    return () => {
      map.remove();
    };
  }, [mapStyle, containerRef]);

  return { mapRef, isLoaded };
};

