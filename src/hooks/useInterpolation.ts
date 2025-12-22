import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { BusPosition, InterpolatedBus } from '@/types/bus';

export const useInterpolation = (
  map: maplibregl.Map | null,
  rawPositions: BusPosition[]
) => {
  const busesRef = useRef<Map<string, InterpolatedBus>>(new Map());
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!map || rawPositions.length === 0) return;

    const now = performance.now();
    const duration = 15000;

    rawPositions.forEach((raw) => {
      const existing = busesRef.current.get(raw.id);
      
      if (existing) {
        busesRef.current.set(raw.id, {
          ...existing,
          previousPos: existing.currentPos,
          nextPos: [raw.longitude, raw.latitude],
          startTime: now,
          endTime: now + duration,
        });
      } else {
        busesRef.current.set(raw.id, {
          id: raw.id,
          line: raw.line,
          currentPos: [raw.longitude, raw.latitude],
          previousPos: [raw.longitude, raw.latitude],
          nextPos: [raw.longitude, raw.latitude],
          startTime: now,
          endTime: now + duration,
          bearing: raw.bearing || 0,
        });
      }
    });

    const animate = () => {
      const currentTime = performance.now();
      const features: GeoJSON.Feature[] = [];

      busesRef.current.forEach((bus, id) => {
        const progress = Math.min(1, (currentTime - bus.startTime) / (bus.endTime - bus.startTime));
        
        const lng = bus.previousPos[0] + (bus.nextPos[0] - bus.previousPos[0]) * progress;
        const lat = bus.previousPos[1] + (bus.nextPos[1] - bus.previousPos[1]) * progress;
        
        bus.currentPos = [lng, lat];

        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          properties: {
            id: bus.id,
            line: bus.line,
            bearing: bus.bearing,
          },
        });
      });

      const source = map.getSource('buses') as maplibregl.GeoJSONSource;
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features,
        });
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [map, rawPositions]);
};

