import { useState, useEffect, useMemo } from 'react';
import { BusDirection } from '@/enums/direction';
import { GTFSStop, GTFSTrip, GTFSStopTime } from '@/types/gtfs';
import { calculateDistance } from '@/lib/geoUtils';
import { gtfsService } from '@/services/gtfsService';
import { findActiveTrip, calculateDelayStatus, getCurrentTimeMinutes } from '@/lib/busUtils';

export const useRouteProgression = (
  selectedBusId: string | null | undefined,
  busPosition: { latitude: number; longitude: number; bearing?: number } | null | undefined,
  currentStops: GTFSStop[],
  routeShapes: { direction0: { lat: number; lng: number }[], direction1: { lat: number; lng: number }[] },
  activeDirection: BusDirection,
  trips: GTFSTrip[],
  routeStopTimesMap: Map<string, GTFSStopTime[]>
) => {
  const [stopPositionsOnRoute, setStopPositionsOnRoute] = useState<number[]>([]);
  const [currentTime, setCurrentTime] = useState<number>(getCurrentTimeMinutes());

  useEffect(() => {
    const updateTime = () => setCurrentTime(getCurrentTimeMinutes());
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const currentShape = activeDirection === BusDirection.OUTBOUND ? routeShapes.direction0 : routeShapes.direction1;
    if (currentStops.length === 0 || currentShape.length === 0) return;

    let isMounted = true;
    const calculate = async () => {
      const positions = await gtfsService.calculateStopPositions(currentStops, currentShape);
      if (isMounted) setStopPositionsOnRoute(positions);
    };
    calculate();
    return () => { isMounted = false; };
  }, [currentStops, routeShapes, activeDirection]);

  const { passedStops, nextStopIndex } = useMemo(() => {
    if (!selectedBusId || !busPosition || currentStops.length === 0) {
      return { passedStops: new Set<number>(), nextStopIndex: null };
    }
    
    const currentShape = activeDirection === BusDirection.OUTBOUND ? routeShapes.direction0 : routeShapes.direction1;
    
    if (currentShape.length === 0 || stopPositionsOnRoute.length === 0) {
      let nearestIndex = 0;
      let minDistance = Infinity;
      currentStops.forEach((stop, index) => {
        const distance = calculateDistance(busPosition.latitude, busPosition.longitude, stop.lat, stop.lng);
        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = index;
        }
      });

      const passed = new Set<number>();
      for (let i = 0; i < nearestIndex; i++) passed.add(i);
      return { passedStops: passed, nextStopIndex: nearestIndex < currentStops.length - 1 ? nearestIndex : null };
    }

    let closestShapeIndex = 0;
    let minShapeDistance = Infinity;
    currentShape.forEach((point, index) => {
      const distance = calculateDistance(busPosition.latitude, busPosition.longitude, point.lat, point.lng);
      if (distance < minShapeDistance) {
        minShapeDistance = distance;
        closestShapeIndex = index;
      }
    });

    let lastPassedStopIndex = -1;
    for (let i = 0; i < stopPositionsOnRoute.length; i++) {
      if (stopPositionsOnRoute[i] <= closestShapeIndex) lastPassedStopIndex = i;
      else break;
    }

    const passed = new Set<number>();
    let nextIdx: number | null = null;

    if (lastPassedStopIndex >= 0) {
      for (let i = 0; i <= lastPassedStopIndex; i++) passed.add(i);
      if (lastPassedStopIndex < currentStops.length - 1) nextIdx = lastPassedStopIndex + 1;
    } else {
      nextIdx = 0;
    }

    return { passedStops: passed, nextStopIndex: nextIdx };
  }, [selectedBusId, busPosition, currentStops, stopPositionsOnRoute, activeDirection, routeShapes]);

  const activeTrip = useMemo(() => {
    if (trips.length === 0 || routeStopTimesMap.size === 0) return null;
    const nextStopId = (nextStopIndex !== null && currentStops[nextStopIndex]) ? currentStops[nextStopIndex].id : undefined;
    return findActiveTrip(trips, routeStopTimesMap, activeDirection, currentTime, nextStopId);
  }, [trips, routeStopTimesMap, activeDirection, currentTime, nextStopIndex, currentStops]);

  const delayStatus = useMemo(() => {
    if (nextStopIndex === null || currentStops.length === 0 || !activeTrip || nextStopIndex >= currentStops.length) return null;
    return calculateDelayStatus(currentStops[nextStopIndex].id, activeTrip, routeStopTimesMap, currentTime);
  }, [nextStopIndex, currentStops, activeTrip, routeStopTimesMap, currentTime]);

  return {
    passedStops,
    nextStopIndex,
    delayStatus,
    activeTrip
  };
};

