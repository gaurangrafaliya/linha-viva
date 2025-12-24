import { useState, useEffect, useRef } from 'react';
import { gtfsService } from '@/services/gtfsService';
import { GTFSRoute } from '@/types/gtfs';

export interface DashboardLookups {
  stopsMap: Map<string, string>;
  tripStopMap: Map<string, Set<string>>;
  routeTripsMap: Map<string, Set<string>>;
  routeStopNamesMap: Map<string, Set<string>>;
}

export const useDashboardData = () => {
  const [routes, setRoutes] = useState<GTFSRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const lookupsRef = useRef<DashboardLookups | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [routesData, stopTimesData, allStopsData, allTripsData] = await Promise.all([
          gtfsService.fetchRoutes(),
          gtfsService.fetchStopTimes(),
          gtfsService.fetchStops(),
          gtfsService.fetchAllTrips(),
        ]);

        const stopsMap = new Map(allStopsData.map(s => [s.id, s.name]));
        
        const tripStopMap = new Map<string, Set<string>>();
        stopTimesData.forEach(st => {
          const existing = tripStopMap.get(st.tripId) || new Set();
          existing.add(st.stopId);
          tripStopMap.set(st.tripId, existing);
        });
        
        const routeTripsMap = new Map<string, Set<string>>();
        allTripsData.forEach(trip => {
          const existing = routeTripsMap.get(trip.routeId) || new Set();
          existing.add(trip.tripId);
          routeTripsMap.set(trip.routeId, existing);
        });

        const routeStopNamesMap = new Map<string, Set<string>>();
        routesData.forEach(route => {
          const stopNames = new Set<string>();
          const routeTrips = routeTripsMap.get(route.id);
          if (routeTrips) {
            routeTrips.forEach(tripId => {
              const stopIds = tripStopMap.get(tripId);
              if (stopIds) {
                stopIds.forEach(stopId => {
                  const stopName = stopsMap.get(stopId);
                  if (stopName) stopNames.add(stopName.toLowerCase());
                });
              }
            });
          }
          routeStopNamesMap.set(route.id, stopNames);
        });

        lookupsRef.current = {
          stopsMap,
          tripStopMap,
          routeTripsMap,
          routeStopNamesMap,
        };

        setRoutes(routesData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return { routes, loading, lookupsRef };
};

