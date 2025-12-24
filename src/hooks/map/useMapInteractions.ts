import { useEffect, MutableRefObject } from 'react';
import maplibregl from 'maplibre-gl';
import { SelectedBus } from '@/types/bus';

export const useMapInteractions = (
  mapRef: MutableRefObject<maplibregl.Map | null>,
  isLoaded: boolean,
  tripsRef: MutableRefObject<Map<string, string>>,
  handleBusSelect: (bus: SelectedBus | null) => void
) => {
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const map = mapRef.current;

    const handleClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const busId = feature.properties?.id;
        const line = feature.properties?.line;
        
        if (busId && line) {
          const routeId = tripsRef.current.get(line) || null;
          handleBusSelect({ id: busId, line, routeId });
        }
      }
    };

    const handleMouseEnter = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      map.getCanvas().style.cursor = 'pointer';
      if (e.features && e.features.length > 0) {
        map.setFeatureState(
          { source: 'buses', id: e.features[0].id },
          { hover: true }
        );
      }
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
      const features = map.queryRenderedFeatures({ layers: ['bus-circles'] });
      features.forEach(f => {
        map.setFeatureState(
          { source: 'buses', id: f.id },
          { hover: false }
        );
      });
    };

    map.on('click', 'bus-circles', handleClick);
    map.on('mouseenter', 'bus-circles', handleMouseEnter);
    map.on('mouseleave', 'bus-circles', handleMouseLeave);

    return () => {
      map.off('click', 'bus-circles', handleClick);
      map.off('mouseenter', 'bus-circles', handleMouseEnter);
      map.off('mouseleave', 'bus-circles', handleMouseLeave);
    };
  }, [isLoaded, mapRef, tripsRef, handleBusSelect]);
};

