import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, MapPin, Loader2, Info, ExternalLink } from "lucide-react";
import { GTFSRoute, GTFSStop } from "@/types/gtfs";
import { gtfsService } from "@/services/gtfsService";
import { cn } from "@/lib/utils";

interface RouteDetailProps {
  route: GTFSRoute;
  onBack: () => void;
  isDark?: boolean;
  selectedBusId?: string | null;
  busPosition?: { latitude: number; longitude: number; bearing?: number } | null;
}

export const RouteDetail = ({ route, onBack, isDark = false, selectedBusId, busPosition }: RouteDetailProps) => {
  const [stops, setStops] = useState<{ direction0: GTFSStop[], direction1: GTFSStop[] }>({ direction0: [], direction1: [] });
  const [routeShapes, setRouteShapes] = useState<{ direction0: { lat: number; lng: number }[], direction1: { lat: number; lng: number }[] }>({ direction0: [], direction1: [] });
  const [loading, setLoading] = useState(true);
  const [activeDirection, setActiveDirection] = useState<0 | 1>(0);

  useEffect(() => {
    const loadStops = async () => {
      setLoading(true);
      const [stopsData, trips] = await Promise.all([
        gtfsService.fetchStopsForRoute(route.id),
        gtfsService.fetchTrips(route.id)
      ]);
      setStops(stopsData);

      // Load shapes for both directions
      const shapes0: { lat: number; lng: number }[] = [];
      const shapes1: { lat: number; lng: number }[] = [];
      
      for (const trip of trips) {
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

  // Determine bus direction and auto-select it
  useEffect(() => {
    if (!selectedBusId || !busPosition || stops.direction0.length === 0 || stops.direction1.length === 0) return;

    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
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
    let detectedDirection: 0 | 1 = 0;
    
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
        detectedDirection = 1;
      } else if (dir0Aligned && !dir1Aligned) {
        detectedDirection = 0;
      } else {
        // Fallback to closest distance
        detectedDirection = dir1.distance < dir0.distance ? 1 : 0;
      }
    } else {
      detectedDirection = dir1.distance < dir0.distance ? 1 : 0;
    }

    setActiveDirection(detectedDirection);
  }, [selectedBusId, busPosition, stops]);

  const currentStops = activeDirection === 0 ? stops.direction0 : stops.direction1;
  const routeColor = route.color ? `#${route.color}` : 'var(--color-brand-primary)';
  const routeTextColor = route.textColor ? `#${route.textColor}` : '#ffffff';

  // Calculate which stops have been passed and which is next
  const getStopStatus = () => {
    if (!selectedBusId || !busPosition || currentStops.length === 0) {
      return { passedStops: new Set<number>(), nextStopIndex: null };
    }

    const currentShape = activeDirection === 0 ? routeShapes.direction0 : routeShapes.direction1;
    if (currentShape.length === 0) {
      // Fallback to simple distance-based if no shape data
      const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
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

    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
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

    // Find closest point on route shape to bus position
    let closestShapeIndex = 0;
    let minShapeDistance = Infinity;
    currentShape.forEach((point, index) => {
      const distance = calculateDistance(busPosition.latitude, busPosition.longitude, point.lat, point.lng);
      if (distance < minShapeDistance) {
        minShapeDistance = distance;
        closestShapeIndex = index;
      }
    });

    // Find which stops come before the bus's position on the route
    // Project each stop onto the route shape to find its position
    const stopPositionsOnRoute: number[] = [];
    currentStops.forEach((stop) => {
      let closestStopPointIndex = 0;
      let minStopDistance = Infinity;
      currentShape.forEach((point, index) => {
        const distance = calculateDistance(stop.lat, stop.lng, point.lat, point.lng);
        if (distance < minStopDistance) {
          minStopDistance = distance;
          closestStopPointIndex = index;
        }
      });
      stopPositionsOnRoute.push(closestStopPointIndex);
    });

    // Find the last stop that comes before the bus's position
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
  };

  const { passedStops, nextStopIndex } = getStopStatus();
  const nextStopRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to next stop
  useEffect(() => {
    if (nextStopRef.current && containerRef.current) {
      const container = containerRef.current;
      const element = nextStopRef.current;
      
      // Calculate position to be about 1/3 from the top
      const targetScroll = element.offsetTop - (container.clientHeight * 0.3);
      
      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth'
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
            onClick={() => setActiveDirection(0)}
            className={cn(
              "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer",
              activeDirection === 0 
                ? (isDark ? "bg-neutral-700 text-white shadow-sm" : "bg-white text-neutral-900 shadow-sm")
                : "text-neutral-400 hover:text-neutral-600"
            )}
          >
            Outbound
          </button>
          <button
            onClick={() => setActiveDirection(1)}
            className={cn(
              "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer",
              activeDirection === 1 
                ? (isDark ? "bg-neutral-700 text-white shadow-sm" : "bg-white text-neutral-900 shadow-sm")
                : "text-neutral-400 hover:text-neutral-600"
            )}
          >
            Inbound
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
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-medium text-neutral-400 opacity-60">Stop ID: {stop.id}</span>
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

