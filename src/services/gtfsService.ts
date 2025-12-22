import { GTFSRoute, GTFSTrip, GTFSStop, GTFSStopTime } from "@/types/gtfs";

const DATA_PATH = '/data/stcp';

const parseCSV = (text: string) => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return headers.reduce((obj, header, index) => {
      obj[header] = values[index]?.trim();
      return obj;
    }, {} as Record<string, string>);
  });
};

let cachedRoutes: GTFSRoute[] | null = null;
let cachedTrips: GTFSTrip[] | null = null;
let cachedStops: GTFSStop[] | null = null;
let cachedStopTimes: GTFSStopTime[] | null = null;

export const gtfsService = {
  fetchRoutes: async (): Promise<GTFSRoute[]> => {
    if (cachedRoutes) return cachedRoutes;
    try {
      const response = await fetch(`${DATA_PATH}/routes.txt`);
      const text = await response.text();
      const data = parseCSV(text);

      cachedRoutes = data.map(item => ({
        id: item.route_id,
        shortName: item.route_short_name,
        longName: item.route_long_name,
        color: item.route_color,
        textColor: item.route_text_color,
        desc: item.route_desc,
        url: item.route_url,
      }));
      return cachedRoutes;
    } catch (error) {
      console.error('Error fetching GTFS routes:', error);
      return [];
    }
  },

  fetchTrips: async (routeId: string): Promise<GTFSTrip[]> => {
    let trips = cachedTrips;
    if (!trips) {
      try {
        const response = await fetch(`${DATA_PATH}/trips.txt`);
        const text = await response.text();
        const data = parseCSV(text);

        cachedTrips = data.map(item => ({
          routeId: item.route_id,
          tripId: item.trip_id,
          headsign: item.trip_headsign || 'Unknown Destination',
          directionId: parseInt(item.direction_id) || 0,
          shapeId: item.shape_id,
        }));
        trips = cachedTrips;
      } catch (error) {
        console.error('Error fetching GTFS trips:', error);
        return [];
      }
    }

    return (trips || []).filter(item => item.routeId === routeId);
  },

  fetchStopTimes: async (): Promise<GTFSStopTime[]> => {
    if (cachedStopTimes) return cachedStopTimes;
    try {
      const response = await fetch(`${DATA_PATH}/stop_times.txt`);
      const text = await response.text();
      const data = parseCSV(text);

      cachedStopTimes = data.map(item => ({
        tripId: item.trip_id,
        arrivalTime: item.arrival_time,
        departureTime: item.departure_time,
        stopId: item.stop_id,
        stopSequence: parseInt(item.stop_sequence),
      }));
      return cachedStopTimes;
    } catch (error) {
      console.error('Error fetching GTFS stop times:', error);
      return [];
    }
  },

  fetchStops: async (): Promise<GTFSStop[]> => {
    if (cachedStops) return cachedStops;
    try {
      const response = await fetch(`${DATA_PATH}/stops.txt`);
      const text = await response.text();
      const data = parseCSV(text);

      cachedStops = data.map(item => ({
        id: item.stop_id,
        name: item.stop_name,
        lat: parseFloat(item.stop_lat),
        lng: parseFloat(item.stop_lon),
      }));
      return cachedStops;
    } catch (error) {
      console.error('Error fetching GTFS stops:', error);
      return [];
    }
  },

  fetchStopsForRoute: async (routeId: string): Promise<{ direction0: GTFSStop[], direction1: GTFSStop[] }> => {
    const [trips, allStopTimes, allStops] = await Promise.all([
      gtfsService.fetchTrips(routeId),
      gtfsService.fetchStopTimes(),
      gtfsService.fetchStops(),
    ]);

    const stopsMap = new Map(allStops.map(s => [s.id, s]));

    const getStopsForDirection = (directionId: number) => {
      const trip = trips.find(t => t.directionId === directionId);
      if (!trip) return [];

      const stopTimes = allStopTimes
        .filter(st => st.tripId === trip.tripId)
        .sort((a, b) => a.stopSequence - b.stopSequence);

      return stopTimes
        .map(st => stopsMap.get(st.stopId))
        .filter((s): s is GTFSStop => !!s);
    };

    return {
      direction0: getStopsForDirection(0),
      direction1: getStopsForDirection(1),
    };
  }
};

