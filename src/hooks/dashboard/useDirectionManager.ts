import { useState, useEffect, useMemo } from 'react';
import { BusDirection } from '@/enums/direction';
import { GTFSStop } from '@/types/gtfs';
import { calculateDistance } from '@/lib/geoUtils';
import { BusPosition } from '@/types/bus';

export const useDirectionManager = (
  selectedBusId: string | null | undefined,
  busPosition: { latitude: number; longitude: number; bearing?: number } | null | undefined,
  stops: { direction0: GTFSStop[], direction1: GTFSStop[] },
  allBusesOnRoute: BusPosition[],
  onDirectionChange?: (direction: BusDirection) => void
) => {
  const [activeDirection, setActiveDirection] = useState<BusDirection>(BusDirection.OUTBOUND);
  const [isManualDirection, setIsManualDirection] = useState(false);

  const detectedDirection = useMemo(() => {
    if (!selectedBusId || !busPosition || (stops.direction0.length === 0 && stops.direction1.length === 0)) {
      return BusDirection.OUTBOUND;
    }

    const findNearest = (directionStops: GTFSStop[]) => {
      if (directionStops.length === 0) return { index: -1, distance: Infinity };
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

    const d0 = findNearest(stops.direction0);
    const d1 = findNearest(stops.direction1);

    if (stops.direction1.length === 0) return BusDirection.OUTBOUND;
    if (stops.direction0.length === 0) return BusDirection.INBOUND;

    if (busPosition.bearing !== undefined && busPosition.bearing !== null) {
      const checkAlignment = (directionStops: GTFSStop[], nearestIdx: number) => {
        if (nearestIdx < 0 || nearestIdx >= directionStops.length - 1) return false;
        const nextStop = directionStops[nearestIdx + 1];
        let bearingToNext = Math.atan2(nextStop.lng - busPosition.longitude, nextStop.lat - busPosition.latitude) * 180 / Math.PI;
        if (bearingToNext < 0) bearingToNext += 360;
        const bearingDiff = Math.abs(bearingToNext - busPosition.bearing!);
        return (bearingDiff < 60 || bearingDiff > 300);
      };

      const d0Aligned = checkAlignment(stops.direction0, d0.index);
      const d1Aligned = checkAlignment(stops.direction1, d1.index);

      if (d1Aligned && !d0Aligned) return BusDirection.INBOUND;
      if (d0Aligned && !d1Aligned) return BusDirection.OUTBOUND;
    }

    return d1.distance < d0.distance ? BusDirection.INBOUND : BusDirection.OUTBOUND;
  }, [selectedBusId, busPosition, stops]);

  useEffect(() => {
    if (!isManualDirection) {
      setActiveDirection(detectedDirection);
    }
  }, [detectedDirection, isManualDirection]);

  useEffect(() => {
    if (onDirectionChange) {
      onDirectionChange(activeDirection);
    }
  }, [activeDirection, onDirectionChange]);

  useEffect(() => {
    if (selectedBusId) {
      setIsManualDirection(false);
    }
  }, [selectedBusId]);

  const busesByDirection = useMemo(() => {
    const dir0: BusPosition[] = [];
    const dir1: BusPosition[] = [];

    allBusesOnRoute.forEach(bus => {
      const findNearest = (directionStops: GTFSStop[]) => {
        if (directionStops.length === 0) return { index: -1, distance: Infinity };
        let minDist = Infinity;
        let nearestIdx = 0;
        directionStops.forEach((stop, idx) => {
          const dist = calculateDistance(bus.latitude, bus.longitude, stop.lat, stop.lng);
          if (dist < minDist) {
            minDist = dist;
            nearestIdx = idx;
          }
        });
        return { index: nearestIdx, distance: minDist };
      };

      const d0 = findNearest(stops.direction0);
      const d1 = findNearest(stops.direction1);

      if (stops.direction1.length === 0) {
        dir0.push(bus);
        return;
      }
      if (stops.direction0.length === 0) {
        dir1.push(bus);
        return;
      }

      let direction = BusDirection.OUTBOUND;
      if (bus.bearing !== undefined && bus.bearing !== null) {
        const checkAlignment = (directionStops: GTFSStop[], nearestIdx: number) => {
          if (nearestIdx < 0 || nearestIdx >= directionStops.length - 1) return false;
          const nextStop = directionStops[nearestIdx + 1];
          let bearingToNext = Math.atan2(nextStop.lng - bus.longitude, nextStop.lat - bus.latitude) * 180 / Math.PI;
          if (bearingToNext < 0) bearingToNext += 360;
          const bearingDiff = Math.abs(bearingToNext - bus.bearing!);
          return (bearingDiff < 60 || bearingDiff > 300);
        };

        const d0Aligned = checkAlignment(stops.direction0, d0.index);
        const d1Aligned = checkAlignment(stops.direction1, d1.index);

        if (d1Aligned && !d0Aligned) direction = BusDirection.INBOUND;
        else if (d0Aligned && !d1Aligned) direction = BusDirection.OUTBOUND;
        else direction = d1.distance < d0.distance ? BusDirection.INBOUND : BusDirection.OUTBOUND;
      } else {
        direction = d1.distance < d0.distance ? BusDirection.INBOUND : BusDirection.OUTBOUND;
      }

      if (direction === BusDirection.OUTBOUND) dir0.push(bus);
      else dir1.push(bus);
    });

    return { direction0: dir0, direction1: dir1 };
  }, [allBusesOnRoute, stops]);

  return {
    activeDirection,
    setActiveDirection,
    setIsManualDirection,
    busesByDirection
  };
};

