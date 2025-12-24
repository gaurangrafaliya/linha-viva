import { useEffect, useRef } from 'react';
import { gtfsService } from '@/services/gtfsService';
import { GTFSRoute } from '@/types/gtfs';

export const useMapMetadata = () => {
  const routesRef = useRef<Map<string, GTFSRoute>>(new Map());
  const tripsRef = useRef<Map<string, string>>(new Map()); // line -> routeId

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [routesData, tripsData] = await Promise.all([
          gtfsService.fetchRoutes(),
          gtfsService.fetchAllTrips()
        ]);
        
        const routeMap = new Map();
        routesData.forEach(r => routeMap.set(r.id, r));
        routesRef.current = routeMap;

        const tripMap = new Map();
        tripsData.forEach(t => {
          const route = routeMap.get(t.routeId);
          if (route) {
            tripMap.set(route.shortName, t.routeId);
          }
        });
        tripsRef.current = tripMap;
      } catch (error) {
        console.error('Error loading map metadata:', error);
      }
    };
    loadMetadata();
  }, []);

  return { routesRef, tripsRef };
};

