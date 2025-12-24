import { useState, useEffect, useMemo } from 'react';
import { gtfsService } from '@/services/gtfsService';
import { GTFSStop, GTFSTrip, GTFSStopTime } from '@/types/gtfs';

export const useRouteDetailData = (routeId: string) => {
  const [stops, setStops] = useState<{ direction0: GTFSStop[], direction1: GTFSStop[] }>({ direction0: [], direction1: [] });
  const [routeShapes, setRouteShapes] = useState<{ direction0: { lat: number; lng: number }[], direction1: { lat: number; lng: number }[] }>({ direction0: [], direction1: [] });
  const [loading, setLoading] = useState(true);
  const [stopTimes, setStopTimes] = useState<GTFSStopTime[]>([]);
  const [trips, setTrips] = useState<GTFSTrip[]>([]);
  const [bestTrips, setBestTrips] = useState<{ direction0: GTFSTrip | null, direction1: GTFSTrip | null }>({ direction0: null, direction1: null });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [stopsData, tripsData, stopTimesData, bestTripsData] = await Promise.all([
          gtfsService.fetchStopsForRoute(routeId),
          gtfsService.fetchTrips(routeId),
          gtfsService.fetchStopTimes(),
          gtfsService.fetchRepresentativeTrips(routeId)
        ]);

        setStops(stopsData);
        setTrips(tripsData);
        setStopTimes(stopTimesData);
        setBestTrips(bestTripsData);

        const [shape0, shape1] = await Promise.all([
          bestTripsData.direction0?.shapeId ? gtfsService.fetchShape(bestTripsData.direction0.shapeId) : Promise.resolve([]),
          bestTripsData.direction1?.shapeId ? gtfsService.fetchShape(bestTripsData.direction1.shapeId) : Promise.resolve([])
        ]);

        setRouteShapes({
          direction0: shape0.map(s => ({ lat: s.lat, lng: s.lng })),
          direction1: shape1.map(s => ({ lat: s.lat, lng: s.lng }))
        });
      } catch (error) {
        console.error('Error loading route detail data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [routeId]);

  const routeStopTimesMap = useMemo(() => {
    if (trips.length === 0 || stopTimes.length === 0) {
      return new Map<string, GTFSStopTime[]>();
    }

    const tripIds = new Set(trips.map(t => t.tripId));
    const map = new Map<string, GTFSStopTime[]>();

    for (const stopTime of stopTimes) {
      if (tripIds.has(stopTime.tripId)) {
        const existing = map.get(stopTime.tripId) || [];
        existing.push(stopTime);
        map.set(stopTime.tripId, existing);
      }
    }

    map.forEach((times) => {
      times.sort((a, b) => a.stopSequence - b.stopSequence);
    });

    return map;
  }, [trips, stopTimes]);

  return {
    stops,
    routeShapes,
    loading,
    trips,
    bestTrips,
    routeStopTimesMap
  };
};

