import { GTFSRoute, GTFSTrip, GTFSStop, GTFSStopTime, GTFSShape } from "@/types/gtfs";
import { WorkerMessageType } from "@/enums/worker";
import { GtfsCacheKey } from "@/enums/cache";
import { BusDirection } from "@/enums/direction";

const DATA_PATH = '/data/stcp';
const worker = new Worker(new URL('./csvWorker.ts', import.meta.url), { type: 'module' });

let lastRequestId = 0;
const workerParse = <T = any>(type: WorkerMessageType, text?: string, data?: any): Promise<T> => {
  const requestId = ++lastRequestId;
  return new Promise((resolve) => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.requestId === requestId) {
        worker.removeEventListener('message', handleMessage);
        resolve(e.data.result !== undefined ? e.data.result : e.data.shapesByShapeId);
      }
    };
    worker.addEventListener('message', handleMessage);
    worker.postMessage({ type, text, data, requestId });
  });
};

let cachedRoutes: GTFSRoute[] | null = null;
let cachedTrips: GTFSTrip[] | null = null;
let cachedStops: GTFSStop[] | null = null;
let cachedStopTimes: GTFSStopTime[] | null = null;
let cachedTripsByRoute: Map<string, GTFSTrip[]> | null = null;
let cachedShapes: Map<string, GTFSShape[]> | null = null;

const ongoingRequests = new Map<string, Promise<any>>();

const getOrFetch = async <T>(key: string, fetchFn: () => Promise<T>): Promise<T> => {
  if (ongoingRequests.has(key)) {
    return ongoingRequests.get(key);
  }
  const promise = fetchFn().finally(() => ongoingRequests.delete(key));
  ongoingRequests.set(key, promise);
  return promise;
};

export const gtfsService = {
  fetchRoutes: async (): Promise<GTFSRoute[]> => {
    if (cachedRoutes) return cachedRoutes;
    return getOrFetch(GtfsCacheKey.ROUTES, async () => {
      try {
        const response = await fetch(`${DATA_PATH}/routes.txt`);
        const text = await response.text();
        const data = await workerParse<any[]>(WorkerMessageType.PARSE_CSV, text);

        cachedRoutes = data.map((item) => ({
          id: item.route_id,
          shortName: item.route_short_name,
          longName: item.route_long_name,
          color: item.route_color,
          textColor: item.route_text_color,
          desc: item.route_desc,
          url: item.route_url,
        }));
        return cachedRoutes!;
      } catch (error) {
        console.error('Error fetching GTFS routes:', error);
        return [];
      }
    });
  },

  fetchAllTrips: async (): Promise<GTFSTrip[]> => {
    if (cachedTrips) return cachedTrips;
    return getOrFetch(GtfsCacheKey.TRIPS, async () => {
      try {
        const response = await fetch(`${DATA_PATH}/trips.txt`);
        const text = await response.text();
        const data = await workerParse<any[]>(WorkerMessageType.PARSE_CSV, text);

        cachedTrips = data.map((item) => ({
          routeId: item.route_id,
          tripId: item.trip_id,
          headsign: item.trip_headsign || 'Unknown Destination',
          directionId: (parseInt(item.direction_id) === 1 ? BusDirection.INBOUND : BusDirection.OUTBOUND),
          shapeId: item.shape_id,
        }));
        
        cachedTripsByRoute = new Map<string, GTFSTrip[]>();
        cachedTrips!.forEach(trip => {
          const existing = cachedTripsByRoute!.get(trip.routeId) || [];
          existing.push(trip);
          cachedTripsByRoute!.set(trip.routeId, existing);
        });
        
        return cachedTrips!;
      } catch (error) {
        console.error('Error fetching GTFS trips:', error);
        return [];
      }
    });
  },

  fetchTrips: async (routeId: string): Promise<GTFSTrip[]> => {
    if (cachedTripsByRoute) {
      return (cachedTripsByRoute as Map<string, GTFSTrip[]>).get(routeId) || [];
    }
    
    await gtfsService.fetchAllTrips();
    return (cachedTripsByRoute as Map<string, GTFSTrip[]> | null)?.get(routeId) || [];
  },

  fetchStopTimes: async (): Promise<GTFSStopTime[]> => {
    if (cachedStopTimes) return cachedStopTimes;
    return getOrFetch(GtfsCacheKey.STOP_TIMES, async () => {
      try {
        const response = await fetch(`${DATA_PATH}/stop_times.txt`);
        const text = await response.text();
        const data = await workerParse<any[]>(WorkerMessageType.PARSE_CSV, text);

        cachedStopTimes = data.map((item) => ({
          tripId: item.trip_id,
          arrivalTime: item.arrival_time,
          departureTime: item.departure_time,
          stopId: item.stop_id,
          stopSequence: parseInt(item.stop_sequence),
        }));
        return cachedStopTimes!;
      } catch (error) {
        console.error('Error fetching GTFS stop times:', error);
        return [];
      }
    });
  },

  fetchStops: async (): Promise<GTFSStop[]> => {
    if (cachedStops) return cachedStops;
    return getOrFetch(GtfsCacheKey.STOPS, async () => {
      try {
        const response = await fetch(`${DATA_PATH}/stops.txt`);
        const text = await response.text();
        const data = await workerParse<any[]>(WorkerMessageType.PARSE_CSV, text);

        cachedStops = data.map((item) => ({
          id: item.stop_id,
          name: item.stop_name,
          lat: parseFloat(item.stop_lat),
          lng: parseFloat(item.stop_lon),
        }));
        return cachedStops!;
      } catch (error) {
        console.error('Error fetching GTFS stops:', error);
        return [];
      }
    });
  },

  fetchRepresentativeTrips: async (routeId: string): Promise<{ direction0: GTFSTrip | null, direction1: GTFSTrip | null }> => {
    const [trips, allStopTimes, routes] = await Promise.all([
      gtfsService.fetchTrips(routeId),
      gtfsService.fetchStopTimes(),
      gtfsService.fetchRoutes(),
    ]);

    const route = routes.find(r => r.id === routeId);
    const terminals = route?.longName.split(' - ').map(t => t.trim().toLowerCase()) || [];

    const tripIdSet = new Set(trips.map(t => t.tripId));
    const counts = new Map<string, number>();
    allStopTimes.forEach(st => {
      if (tripIdSet.has(st.tripId)) {
        counts.set(st.tripId, (counts.get(st.tripId) || 0) + 1);
      }
    });

    const getBestTrip = (directionId: BusDirection) => {
      const directionTrips = trips.filter(t => t.directionId === directionId);
      if (directionTrips.length === 0) return null;

      const tripScores = directionTrips.map(trip => {
        const stopCount = counts.get(trip.tripId) || 0;
        const headsign = trip.headsign.toLowerCase();
        
        let score = stopCount;
        if (terminals.some(t => headsign.includes(t) || t.includes(headsign))) {
          score += 1000;
        }
        
        return { trip, score };
      });

      return tripScores.reduce((prev, current) => 
        (current.score > prev.score) ? current : prev
      ).trip;
    };

    return {
      direction0: getBestTrip(BusDirection.OUTBOUND),
      direction1: getBestTrip(BusDirection.INBOUND),
    };
  },

  fetchStopsForRoute: async (routeId: string): Promise<{ direction0: GTFSStop[], direction1: GTFSStop[] }> => {
    const [bestTrips, allStopTimes, allStops] = await Promise.all([
      gtfsService.fetchRepresentativeTrips(routeId),
      gtfsService.fetchStopTimes(),
      gtfsService.fetchStops(),
    ]);

    const stopsMap = new Map(allStops.map(s => [s.id, s]));

    const getStopsForTrip = (trip: GTFSTrip | null) => {
      if (!trip) return [];

      const stopTimes = allStopTimes
        .filter(st => st.tripId === trip.tripId)
        .sort((a, b) => a.stopSequence - b.stopSequence);

      return stopTimes
        .map(st => stopsMap.get(st.stopId))
        .filter((s): s is GTFSStop => !!s);
    };

    return {
      direction0: getStopsForTrip(bestTrips.direction0),
      direction1: getStopsForTrip(bestTrips.direction1),
    };
  },

  fetchShape: async (shapeId: string): Promise<GTFSShape[]> => {
    if (cachedShapes?.has(shapeId)) {
      return cachedShapes.get(shapeId) || [];
    }

    if (!cachedShapes) {
      cachedShapes = new Map();
      return getOrFetch(GtfsCacheKey.ALL_SHAPES, async () => {
        try {
          const response = await fetch(`${DATA_PATH}/shapes.txt`);
          const text = await response.text();
          const shapesObj = await workerParse(WorkerMessageType.PROCESS_SHAPES, text);

          cachedShapes = new Map(Object.entries(shapesObj));
          
          return cachedShapes!.get(shapeId) || [];
        } catch (error) {
          console.error('Error fetching GTFS shapes:', error);
          return [];
        }
      });
    }

    return cachedShapes.get(shapeId) || [];
  },

  calculateStopPositions: async (stops: GTFSStop[], shape: { lat: number, lng: number }[]): Promise<number[]> => {
    const result = await workerParse(WorkerMessageType.CALCULATE_STOP_POSITIONS, undefined, { stops, shape });
    return result;
  }
};
