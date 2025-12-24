import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, MapPin, Loader2, Info, ExternalLink } from "lucide-react";
import { GTFSRoute, GTFSStop, GTFSStopTime, GTFSTrip } from "@/types/gtfs";
import { gtfsService } from "@/services/gtfsService";
import { cn } from "@/lib/utils";

interface RouteDetailProps {
  route: GTFSRoute;
  onBack: () => void;
  isDark?: boolean;
  selectedBusId?: string | null;
  busPosition?: { latitude: number; longitude: number; bearing?: number } | null;
  onDirectionChange?: (direction: 0 | 1) => void;
  onSwitchBusForDirection?: (direction: 0 | 1) => void;
}

// Extract distance calculation outside component to avoid recreating on every render
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Parse GTFS time format (HH:MM:SS) to minutes since midnight
const parseGTFSTime = (timeStr: string): number => {
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  return hours * 60 + minutes + seconds / 60;
};

// Get current time in minutes since midnight
const getCurrentTimeMinutes = (): number => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
};

// Find active trip based on current time (optimized with pre-filtered stopTimesMap)
const findActiveTrip = (
  trips: GTFSTrip[],
  stopTimesMap: Map<string, GTFSStopTime[]>,
  directionId: number,
  currentTimeMinutes: number
): GTFSTrip | null => {
  const directionTrips = trips.filter(trip => trip.directionId === directionId);
  
  let bestTrip: GTFSTrip | null = null;
  let minTimeDiff = Infinity;

  for (const trip of directionTrips) {
    const tripStopTimes = stopTimesMap.get(trip.tripId);
    if (!tripStopTimes || tripStopTimes.length === 0) continue;

    const firstStopTime = parseGTFSTime(tripStopTimes[0].arrivalTime);
    const lastStopTime = parseGTFSTime(tripStopTimes[tripStopTimes.length - 1].arrivalTime);

    // Check if current time falls within this trip's time range
    // Handle day rollover (times after midnight)
    let timeDiff: number;
    if (firstStopTime <= lastStopTime) {
      // Normal case: trip doesn't cross midnight
      if (currentTimeMinutes >= firstStopTime && currentTimeMinutes <= lastStopTime) {
        timeDiff = 0; // Current time is within trip range
      } else if (currentTimeMinutes < firstStopTime) {
        timeDiff = firstStopTime - currentTimeMinutes;
      } else {
        timeDiff = currentTimeMinutes - lastStopTime;
      }
    } else {
      // Trip crosses midnight
      if (currentTimeMinutes >= firstStopTime || currentTimeMinutes <= lastStopTime) {
        timeDiff = 0; // Current time is within trip range
      } else {
        // Find minimum time difference
        const diff1 = firstStopTime - currentTimeMinutes;
        const diff2 = currentTimeMinutes - lastStopTime;
        timeDiff = Math.min(diff1, diff2);
      }
    }

    if (timeDiff < minTimeDiff) {
      minTimeDiff = timeDiff;
      bestTrip = trip;
    }
  }

  return bestTrip;
};

// Format minutes since midnight to HH:MM
const formatTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Calculate delay status for next stop (optimized with pre-built stopTimesMap)
const calculateDelayStatus = (
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

  // Handle day rollover
  let adjustedDelay = delayMinutes;
  if (adjustedDelay > 720) { // More than 12 hours, likely wrapped around
    adjustedDelay = adjustedDelay - 1440; // Subtract 24 hours
  } else if (adjustedDelay < -720) {
    adjustedDelay = adjustedDelay + 1440; // Add 24 hours
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

export const RouteDetail = ({ route, onBack, isDark = false, selectedBusId, busPosition, onDirectionChange, onSwitchBusForDirection }: RouteDetailProps) => {
  const [stops, setStops] = useState<{ direction0: GTFSStop[], direction1: GTFSStop[] }>({ direction0: [], direction1: [] });
  const [routeShapes, setRouteShapes] = useState<{ direction0: { lat: number; lng: number }[], direction1: { lat: number; lng: number }[] }>({ direction0: [], direction1: [] });
  const [loading, setLoading] = useState(true);
  const [activeDirection, setActiveDirection] = useState<0 | 1>(0);
  const [isManualDirection, setIsManualDirection] = useState(false);
  const [stopTimes, setStopTimes] = useState<GTFSStopTime[]>([]);
  const [trips, setTrips] = useState<GTFSTrip[]>([]);
  const [activeTrip, setActiveTrip] = useState<GTFSTrip | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(getCurrentTimeMinutes());

  useEffect(() => {
    const loadStops = async () => {
      setLoading(true);
      const [stopsData, tripsData, stopTimesData] = await Promise.all([
        gtfsService.fetchStopsForRoute(route.id),
        gtfsService.fetchTrips(route.id),
        gtfsService.fetchStopTimes()
      ]);
      setStops(stopsData);
      setTrips(tripsData);
      setStopTimes(stopTimesData);

      // Load shapes for both directions
      const shapes0: { lat: number; lng: number }[] = [];
      const shapes1: { lat: number; lng: number }[] = [];
      
      for (const trip of tripsData) {
        if (trip.shapeId) {
          const shape = await gtfsService.fetchShape(trip.shapeId);
          const coords = shape.map(s => ({ lat: s.lat, lng: s.lng }));
          if (trip.directionId === 0) {
            shapes0.push(...coords);
          } else {
            shapes1.push(...coords);
          }
        }
      }

      setRouteShapes({ direction0: shapes0, direction1: shapes1 });
      setLoading(false);
    };
    loadStops();
  }, [route.id]);

  // Memoize direction detection to avoid recalculating on every render
  const detectedDirection = useMemo(() => {
    if (!selectedBusId || !busPosition || stops.direction0.length === 0 || stops.direction1.length === 0) {
      return 0 as 0 | 1;
    }

    // Find nearest stop in each direction
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

    const dir0 = findNearestInDirection(stops.direction0);
    const dir1 = findNearestInDirection(stops.direction1);

    // Determine direction based on which has closer stops and bearing alignment
    let direction: 0 | 1 = 0;
    
    if (busPosition.bearing !== undefined && busPosition.bearing !== null) {
      const busBearing = busPosition.bearing;
      // Check bearing alignment with next stops in each direction
      const checkDirectionAlignment = (directionStops: GTFSStop[], nearestIdx: number) => {
        if (nearestIdx >= directionStops.length - 1) return false;
        const nextStop = directionStops[nearestIdx + 1];
        const bearingToNext = Math.atan2(
          nextStop.lng - busPosition.longitude,
          nextStop.lat - busPosition.latitude
        ) * 180 / Math.PI;
        const bearingDiff = Math.abs(bearingToNext - busBearing);
        const isAligned = (bearingDiff < 45 || bearingDiff > 315);
        
        return isAligned;
      };

      const dir0Aligned = checkDirectionAlignment(stops.direction0, dir0.index);
      const dir1Aligned = checkDirectionAlignment(stops.direction1, dir1.index);

      if (dir1Aligned && !dir0Aligned) {
        direction = 1;
      } else if (dir0Aligned && !dir1Aligned) {
        direction = 0;
      } else {
        // Fallback to closest distance
        direction = dir1.distance < dir0.distance ? 1 : 0;
      }
    } else {
      direction = dir1.distance < dir0.distance ? 1 : 0;
    }

    return direction;
  }, [selectedBusId, busPosition, stops.direction0, stops.direction1]);

  // Update active direction when detected direction changes (only if not manually set)
  useEffect(() => {
    if (!isManualDirection) {
      setActiveDirection(detectedDirection);
    }
  }, [detectedDirection, isManualDirection]);

  // Notify parent when direction changes
  useEffect(() => {
    if (onDirectionChange) {
      onDirectionChange(activeDirection);
    }
  }, [activeDirection, onDirectionChange]);

  // Reset manual direction flag when bus selection changes
  useEffect(() => {
    if (selectedBusId) {
      setIsManualDirection(false);
    }
  }, [selectedBusId]);

  const currentStops = useMemo(() => 
    activeDirection === 0 ? stops.direction0 : stops.direction1,
    [activeDirection, stops.direction0, stops.direction1]
  );

  // Get destination names (headsigns) for each direction
  const directionLabels = useMemo(() => {
    const direction0Trip = trips.find(t => t.directionId === 0);
    const direction1Trip = trips.find(t => t.directionId === 1);
    
    const label0 = direction0Trip?.headsign || 'Outbound';
    const label1 = direction1Trip?.headsign || 'Inbound';
    
    // If we have stops, we can also show origin → destination format
    const getOriginDestination = (directionStops: GTFSStop[]) => {
      if (directionStops.length === 0) return null;
      const origin = directionStops[0]?.name;
      const destination = directionStops[directionStops.length - 1]?.name;
      if (origin && destination && origin !== destination) {
        return `${origin} → ${destination}`;
      }
      return null;
    };

    const dir0Label = getOriginDestination(stops.direction0) || label0;
    const dir1Label = getOriginDestination(stops.direction1) || label1;

    return { direction0: dir0Label, direction1: dir1Label };
  }, [trips, stops.direction0, stops.direction1]);

  // Create memoized map of stopTimes by tripId for current route only (performance optimization)
  const routeStopTimesMap = useMemo(() => {
    if (trips.length === 0 || stopTimes.length === 0) {
      return new Map<string, GTFSStopTime[]>();
    }

    const tripIds = new Set(trips.map(t => t.tripId));
    const map = new Map<string, GTFSStopTime[]>();

    // Only process stopTimes for trips in this route
    for (const stopTime of stopTimes) {
      if (tripIds.has(stopTime.tripId)) {
        const existing = map.get(stopTime.tripId) || [];
        existing.push(stopTime);
        map.set(stopTime.tripId, existing);
      }
    }

    // Sort stopTimes by sequence for each trip
    map.forEach((times, tripId) => {
      times.sort((a, b) => a.stopSequence - b.stopSequence);
    });

    return map;
  }, [trips, stopTimes]);

  // Determine active trip based on current time and update time periodically
  useEffect(() => {
    if (trips.length === 0 || routeStopTimesMap.size === 0) {
      setActiveTrip(null);
      return;
    }

    const updateTripAndTime = () => {
      const newTimeMinutes = getCurrentTimeMinutes();
      setCurrentTime(newTimeMinutes);
      const trip = findActiveTrip(trips, routeStopTimesMap, activeDirection, newTimeMinutes);
      setActiveTrip(trip);
    };

    // Initial update
    updateTripAndTime();

    // Update every minute to keep trip selection and delay status current
    const interval = setInterval(updateTripAndTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [trips, routeStopTimesMap, activeDirection]);

  const routeColor = route.color ? `#${route.color}` : 'var(--color-brand-primary)';
  const routeTextColor = route.textColor ? `#${route.textColor}` : '#ffffff';

  const [stopPositionsOnRoute, setStopPositionsOnRoute] = useState<number[]>([]);

  // Pre-calculate stop positions on the route shape via Worker
  useEffect(() => {
    const currentShape = activeDirection === 0 ? routeShapes.direction0 : routeShapes.direction1;
    if (currentStops.length === 0 || currentShape.length === 0) return;

    let isMounted = true;
    const calculate = async () => {
      const positions = await gtfsService.calculateStopPositions(currentStops, currentShape);
      if (isMounted) {
        setStopPositionsOnRoute(positions);
      }
    };
    calculate();
    return () => { isMounted = false; };
  }, [currentStops, routeShapes, activeDirection]);

  // Memoize stop status calculation to avoid expensive recalculations on every render
  const { passedStops, nextStopIndex } = useMemo(() => {
    if (!selectedBusId || !busPosition || currentStops.length === 0) {
      return { passedStops: new Set<number>(), nextStopIndex: null };
    }
    
    return ((): { passedStops: Set<number>, nextStopIndex: number | null } => {
      const currentShape = activeDirection === 0 ? routeShapes.direction0 : routeShapes.direction1;
      
      if (currentShape.length === 0 || stopPositionsOnRoute.length === 0) {
        // Fallback to simple distance-based if no shape data or pre-calculated positions
        let nearestIndex = 0;
        let minDistance = Infinity;
        currentStops.forEach((stop, index) => {
          const distance = calculateDistance(busPosition.latitude, busPosition.longitude, stop.lat, stop.lng);
          if (distance < minDistance) {
            minDistance = distance;
            nearestIndex = index;
          }
        });

        const passedStops = new Set<number>();
        for (let i = 0; i < nearestIndex; i++) {
          passedStops.add(i);
        }
        return { passedStops, nextStopIndex: nearestIndex < currentStops.length - 1 ? nearestIndex : null };
      }

      // Find closest point on route shape to bus position
      // This is O(ShapePoints), much faster than O(Stops * ShapePoints)
      let closestShapeIndex = 0;
      let minShapeDistance = Infinity;
      currentShape.forEach((point, index) => {
        const distance = calculateDistance(busPosition.latitude, busPosition.longitude, point.lat, point.lng);
        if (distance < minShapeDistance) {
          minShapeDistance = distance;
          closestShapeIndex = index;
        }
      });

      // Find the last stop that comes before the bus's position using pre-calculated positions
      let lastPassedStopIndex = -1;
      for (let i = 0; i < stopPositionsOnRoute.length; i++) {
        if (stopPositionsOnRoute[i] <= closestShapeIndex) {
          lastPassedStopIndex = i;
        } else {
          break;
        }
      }

      const passedStops = new Set<number>();
      let nextStopIndex: number | null = null;

      // Mark all stops up to and including the last passed stop
      if (lastPassedStopIndex >= 0) {
        for (let i = 0; i <= lastPassedStopIndex; i++) {
          passedStops.add(i);
        }
        // Next stop is the one after the last passed
        if (lastPassedStopIndex < currentStops.length - 1) {
          nextStopIndex = lastPassedStopIndex + 1;
        }
      } else {
        // Bus hasn't reached the first stop yet
        nextStopIndex = 0;
      }

      return { passedStops, nextStopIndex };
    })();
  }, [selectedBusId, busPosition, currentStops, stopPositionsOnRoute, activeDirection, routeShapes]);

  // Calculate delay status for next stop
  const delayStatus = useMemo(() => {
    if (nextStopIndex === null || currentStops.length === 0 || !activeTrip || nextStopIndex >= currentStops.length) {
      return null;
    }
    const nextStop = currentStops[nextStopIndex];
    return calculateDelayStatus(nextStop.id, activeTrip, routeStopTimesMap, currentTime);
  }, [nextStopIndex, currentStops, activeTrip, routeStopTimesMap, currentTime]);

  const nextStopRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollIndexRef = useRef<number | null>(null);

  // Auto-scroll to next stop (only when nextStopIndex actually changes)
  useEffect(() => {
    if (loading || nextStopIndex === null) return;
    
    // Skip scroll if index hasn't changed
    if (lastScrollIndexRef.current === nextStopIndex) return;
    
    if (nextStopRef.current && containerRef.current) {
      const container = containerRef.current;
      const element = nextStopRef.current;
      
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (!nextStopRef.current || !containerRef.current) return;
        
        // Calculate position to be about 1/3 from the top
        const targetScroll = element.offsetTop - (container.clientHeight * 0.3);
        
        container.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: 'smooth'
        });
        
        lastScrollIndexRef.current = nextStopIndex;
      });
    }
  }, [nextStopIndex, loading]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="pt-8 px-6 pb-6">
        <button 
          onClick={onBack}
          className={cn(
            "flex items-center gap-2 mb-6 px-3 py-1.5 rounded-lg transition-colors group cursor-pointer",
            isDark ? "hover:bg-neutral-800 text-neutral-400" : "hover:bg-neutral-100 text-neutral-500"
          )}
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">Back to lines</span>
        </button>

        <div className="flex items-start gap-4">
          <div 
            className="shrink-0 w-14 h-14 rounded-xl flex items-center justify-center font-black text-xl shadow-lg"
            style={{ backgroundColor: routeColor, color: routeTextColor }}
          >
            {route.shortName}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className={cn(
              "text-lg font-black leading-tight tracking-tight",
              isDark ? "text-neutral-50" : "text-neutral-900"
            )}>
              {route.longName}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[9px] font-black uppercase tracking-widest">
                Active Now
              </span>
              {route.url && (
                <a 
                  href={route.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 transition-colors"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Direction Switcher */}
      <div className="px-6 pb-4">
        <div className={cn(
          "flex p-1 rounded-xl",
          isDark ? "bg-neutral-800/50" : "bg-neutral-100"
        )}>
          <button
            onClick={() => {
              const directionChanged = activeDirection !== 0;
              setActiveDirection(0);
              setIsManualDirection(true);
              if (directionChanged && onSwitchBusForDirection) {
                onSwitchBusForDirection(0);
              }
            }}
            className={cn(
              "flex-1 py-2 px-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer truncate",
              activeDirection === 0 
                ? (isDark ? "bg-neutral-700 text-white shadow-sm" : "bg-white text-neutral-900 shadow-sm")
                : "text-neutral-400 hover:text-neutral-600"
            )}
            title={directionLabels.direction0}
          >
            {directionLabels.direction0}
          </button>
          <button
            onClick={() => {
              const directionChanged = activeDirection !== 1;
              setActiveDirection(1);
              setIsManualDirection(true);
              if (directionChanged && onSwitchBusForDirection) {
                onSwitchBusForDirection(1);
              }
            }}
            className={cn(
              "flex-1 py-2 px-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer truncate",
              activeDirection === 1 
                ? (isDark ? "bg-neutral-700 text-white shadow-sm" : "bg-white text-neutral-900 shadow-sm")
                : "text-neutral-400 hover:text-neutral-600"
            )}
            title={directionLabels.direction1}
          >
            {directionLabels.direction1}
          </button>
        </div>
      </div>

      {/* Stops List */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto px-6 pb-8 custom-scrollbar"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-neutral-500 py-20">
            <Loader2 className="animate-spin text-brand-primary" size={24} strokeWidth={3} />
            <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Loading stops</p>
          </div>
        ) : currentStops.length > 0 ? (
          <div className="relative pt-2">
            {/* Timeline Line */}
            <div 
              className={cn(
                "absolute left-[11px] top-6 bottom-6 w-0.5",
                isDark ? "bg-neutral-800" : "bg-neutral-100"
              )} 
            />

            <div className="space-y-6">
              {currentStops.map((stop, index) => {
                const isPassed = passedStops.has(index);
                const isNext = nextStopIndex === index;
                const isTerminal = index === 0 || index === currentStops.length - 1;
                
                return (
                  <div 
                    key={`${stop.id}-${index}`} 
                    ref={isNext ? nextStopRef : null}
                    className={cn(
                      "flex items-start gap-4 relative group transition-all",
                      isNext && "bg-brand-primary/10 rounded-lg p-2 -mx-2"
                    )}
                  >
                    <div className="relative z-10 mt-1.5">
                      <div 
                        className={cn(
                          "w-[24px] h-[24px] rounded-full flex items-center justify-center border-4 transition-transform group-hover:scale-110",
                          isDark ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-100",
                          isTerminal && "border-brand-primary",
                          isNext && "border-brand-primary ring-2 ring-brand-primary/50",
                          isPassed && !isNext && (isDark ? "bg-brand-primary/20 border-brand-primary/40" : "bg-brand-primary/10 border-brand-primary/30")
                        )}
                      >
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full transition-colors",
                          (isTerminal || isNext || isPassed) ? "bg-brand-primary" : (isDark ? "bg-neutral-700" : "bg-neutral-300"),
                          "group-hover:bg-brand-primary"
                        )} />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={cn(
                          "text-[12px] font-bold leading-tight transition-colors",
                          isDark ? "text-neutral-200 group-hover:text-white" : "text-neutral-700 group-hover:text-neutral-900",
                          isNext && "text-brand-primary",
                          isPassed && !isNext && "opacity-60"
                        )}>
                          {stop.name}
                          {isNext && <span className="ml-2 text-[10px] text-brand-primary/70">● Next</span>}
                          {isPassed && !isNext && <span className="ml-2 text-[10px] text-neutral-400">✓ Passed</span>}
                        </p>
                        {isNext && delayStatus && (
                          <div className="flex items-center gap-1.5 leading-none">
                            {delayStatus.status === 'late' && (
                              <span className={cn(
                                "text-[11px] font-medium line-through opacity-40",
                                isDark ? "text-neutral-400" : "text-neutral-500"
                              )}>
                                {delayStatus.scheduledTime}
                              </span>
                            )}
                            <span className={cn(
                              "text-[12px] font-bold",
                              isDark ? "text-neutral-200" : "text-neutral-900"
                            )}>
                              {delayStatus.status === 'on-time' ? delayStatus.scheduledTime : delayStatus.estimatedTime}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-[9px] font-medium text-neutral-400 opacity-60">Stop ID: {stop.id}</span>
                        {isNext && delayStatus && (
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-wider whitespace-nowrap",
                            delayStatus.status === 'on-time' 
                              ? (isDark ? "text-green-400" : "text-green-600")
                              : (isDark ? "text-orange-400" : "text-orange-600")
                          )}>
                            {delayStatus.status === 'on-time' ? 'On Time' : `Late ${delayStatus.delayMinutes} mins`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-neutral-400 py-20 text-center">
            <Info size={24} className="opacity-20" />
            <p className="text-[11px] font-medium">No stop information available for this direction.</p>
          </div>
        )}
      </div>
    </div>
  );
};
