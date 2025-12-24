import { gtfsService } from "@/services/gtfsService";
import { GTFSStop, GTFSTrip, GTFSStopTime } from "@/types/gtfs";
import { calculateDistance } from "./geoUtils";
import { BusDirection } from "@/enums/direction";

export const parseGTFSTime = (timeStr: string): number => {
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  return hours * 60 + minutes + seconds / 60;
};

export const getCurrentTimeMinutes = (): number => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
};

export const formatTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const findActiveTrip = (
  trips: GTFSTrip[],
  stopTimesMap: Map<string, GTFSStopTime[]>,
  directionId: BusDirection,
  currentTimeMinutes: number,
  nextStopId?: string
): GTFSTrip | null => {
  const directionTrips = trips.filter(trip => trip.directionId === directionId);
  
  let bestTrip: GTFSTrip | null = null;
  let minTimeDiff = Infinity;

  for (const trip of directionTrips) {
    const tripStopTimes = stopTimesMap.get(trip.tripId);
    if (!tripStopTimes || tripStopTimes.length === 0) continue;

    let timeDiff: number;

    if (nextStopId) {
      const stopTime = tripStopTimes.find(st => st.stopId === nextStopId);
      if (!stopTime) continue;
      
      const scheduledTime = parseGTFSTime(stopTime.arrivalTime);
      timeDiff = Math.abs(currentTimeMinutes - scheduledTime);
      
      if (timeDiff > 720) {
        timeDiff = 1440 - timeDiff;
      }
    } else {
      const firstStopTime = parseGTFSTime(tripStopTimes[0].arrivalTime);
      const lastStopTime = parseGTFSTime(tripStopTimes[tripStopTimes.length - 1].arrivalTime);

      if (firstStopTime <= lastStopTime) {
        if (currentTimeMinutes >= firstStopTime && currentTimeMinutes <= lastStopTime) {
          const midTime = (firstStopTime + lastStopTime) / 2;
          timeDiff = Math.abs(currentTimeMinutes - midTime) / 1000;
        } else if (currentTimeMinutes < firstStopTime) {
          timeDiff = firstStopTime - currentTimeMinutes;
        } else {
          timeDiff = currentTimeMinutes - lastStopTime;
        }
      } else {
        if (currentTimeMinutes >= firstStopTime || currentTimeMinutes <= lastStopTime) {
          timeDiff = 0;
        } else {
          const diff1 = Math.abs(firstStopTime - currentTimeMinutes);
          const diff2 = Math.abs(currentTimeMinutes - lastStopTime);
          timeDiff = Math.min(
            diff1 > 720 ? 1440 - diff1 : diff1, 
            diff2 > 720 ? 1440 - diff2 : diff2
          );
        }
      }
    }

    if (timeDiff < minTimeDiff) {
      minTimeDiff = timeDiff;
      bestTrip = trip;
    }
  }

  return bestTrip;
};

export const calculateDelayStatus = (
  nextStopId: string,
  activeTrip: GTFSTrip | null,
  stopTimesMap: Map<string, GTFSStopTime[]>,
  currentTimeMinutes: number
): { status: 'on-time' | 'late'; delayMinutes: number; scheduledTime: string; estimatedTime: string } | null => {
  if (!activeTrip) return null;

  const tripStopTimes = stopTimesMap.get(activeTrip.tripId);
  if (!tripStopTimes) return null;

  const nextStopTime = tripStopTimes.find(st => st.stopId === nextStopId);
  if (!nextStopTime) return null;

  const scheduledTimeMinutes = parseGTFSTime(nextStopTime.arrivalTime);
  const delayMinutes = currentTimeMinutes - scheduledTimeMinutes;

  let adjustedDelay = delayMinutes;
  if (adjustedDelay > 720) {
    adjustedDelay = adjustedDelay - 1440;
  } else if (adjustedDelay < -720) {
    adjustedDelay = adjustedDelay + 1440;
  }

  const status = adjustedDelay <= 0 ? 'on-time' : 'late';
  const delayVal = status === 'on-time' ? 0 : Math.round(adjustedDelay);
  const estimatedTimeMinutes = scheduledTimeMinutes + Math.max(0, adjustedDelay);

  return { 
    status, 
    delayMinutes: delayVal,
    scheduledTime: formatTime(scheduledTimeMinutes),
    estimatedTime: formatTime(estimatedTimeMinutes)
  };
};

export const detectBusDirection = async (
  busPosition: { latitude: number; longitude: number; bearing?: number },
  routeId: string
): Promise<BusDirection> => {
  const [stopsData] = await Promise.all([
    gtfsService.fetchStopsForRoute(routeId)
  ]);

  const { direction0, direction1 } = stopsData;
  if (direction0.length === 0 || direction1.length === 0) return BusDirection.OUTBOUND;

  const findNearestInDirection = (directionStops: GTFSStop[]) => {
    let minDist = Infinity;
    let nearestIdx = 0;
    directionStops.forEach((stop, idx) => {
      const dist = calculateDistance(busPosition.latitude, busPosition.longitude, stop.lat, stop.lng);
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = idx;
      }
    });
    return { index: nearestIdx, distance: minDist };
  };

  const dir0 = findNearestInDirection(direction0);
  const dir1 = findNearestInDirection(direction1);

  if (busPosition.bearing !== undefined && busPosition.bearing !== null) {
    const busBearing = busPosition.bearing;
    const checkDirectionAlignment = (directionStops: GTFSStop[], nearestIdx: number) => {
      if (nearestIdx >= directionStops.length - 1) return false;
      const nextStop = directionStops[nearestIdx + 1];
      const bearingToNext = Math.atan2(
        nextStop.lng - busPosition.longitude,
        nextStop.lat - busPosition.latitude
      ) * 180 / Math.PI;
      const bearingDiff = Math.abs(bearingToNext - busBearing);
      return (bearingDiff < 45 || bearingDiff > 315);
    };

    const dir0Aligned = checkDirectionAlignment(direction0, dir0.index);
    const dir1Aligned = checkDirectionAlignment(direction1, dir1.index);

    if (dir1Aligned && !dir0Aligned) return BusDirection.INBOUND;
    if (dir0Aligned && !dir1Aligned) return BusDirection.OUTBOUND;
  }

  return dir1.distance < dir0.distance ? BusDirection.INBOUND : BusDirection.OUTBOUND;
};

