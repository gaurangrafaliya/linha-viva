import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Bus, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { GTFSRoute } from "@/types/gtfs";
import { gtfsService } from "@/services/gtfsService";
import { RouteItem } from "./RouteItem";
import { RouteDetail } from "./RouteDetail";
import { cn } from "@/lib/utils";
import { Theme } from "@/constants/mapStyles";
import { useBusPositions } from "@/hooks/useBusPositions";

interface SelectedBus {
  id: string;
  line: string;
  routeId: string | null;
}

interface RouteDashboardProps {
  selectedRouteId: string | null;
  selectedBus: SelectedBus | null;
  onRouteSelect: (routeId: string | null) => void;
  searchTerm: string;
  theme: Theme;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const RouteDashboard = ({ 
  selectedRouteId, 
  selectedBus,
  onRouteSelect, 
  searchTerm, 
  theme,
  isExpanded,
  onToggleExpand
}: RouteDashboardProps) => {
  const isDark = theme === 'dark';
  const [routes, setRoutes] = useState<GTFSRoute[]>([]);
  const [stops, setStops] = useState<Record<string, string[]>>({}); // routeId -> stopNames[]
  const [loading, setLoading] = useState(true);
  const { positions } = useBusPositions();
  
  const lookupsRef = useRef<{
    stopsMap: Map<string, string>;
    tripStopMap: Map<string, Set<string>>;
    routeTripsMap: Map<string, Set<string>>;
  } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
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

      const routeStops: Record<string, string[]> = {};

      lookupsRef.current = {
        stopsMap,
        tripStopMap,
        routeTripsMap,
      };

      setRoutes(routesData);
      setStops(routeStops);
      setLoading(false);
    };

    loadData();
  }, []);

  const filteredRoutes = useMemo(() => {
    let result = routes;
    const lowerSearch = searchTerm.toLowerCase();

    if (searchTerm) {
      const scoredResults = routes
        .map(route => {
          let score = -1;

          // 1. Exact match on short name (highest priority)
          if (route.shortName.toLowerCase() === lowerSearch) {
            score = 1000;
          }
          // 2. Starts with short name
          else if (route.shortName.toLowerCase().startsWith(lowerSearch)) {
            score = 800;
          }
          // 3. Match in long name
          else if (route.longName.toLowerCase().includes(lowerSearch)) {
            // Higher score if it starts with the search term
            score = route.longName.toLowerCase().startsWith(lowerSearch) ? 600 : 400;
          }
          // 4. Match in stop names
          else if (lookupsRef.current) {
            const lookups = lookupsRef.current;
            const routeTrips = lookups.routeTripsMap.get(route.id);
            if (routeTrips) {
              const stopNames = new Set<string>();
              routeTrips.forEach((tripId: string) => {
                const stopIds = lookups.tripStopMap.get(tripId);
                if (stopIds) {
                  stopIds.forEach((stopId: string) => {
                    const stopName = lookups.stopsMap.get(stopId);
                    if (stopName) stopNames.add(stopName.toLowerCase());
                  });
                }
              });
              
              const hasStopMatch = Array.from(stopNames).some(name => name.includes(lowerSearch));
              if (hasStopMatch) {
                score = 100;
              }
            }
          }

          return { route, score };
        })
        .filter(item => item.score >= 0);

      // Sort by score descending, then by original priority if scores are tied
      return scoredResults
        .sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          
          // If scores are tied, use the standard priority sorting
          return compareRoutes(a.route, b.route);
        })
        .map(item => item.route);
    }

    // Default sorting when no search term
    return [...result].sort(compareRoutes);
  }, [routes, searchTerm]);

  // Helper function for standard priority sorting
  function compareRoutes(a: GTFSRoute, b: GTFSRoute) {
    const getPriority = (shortName: string) => {
      if (shortName.endsWith('M')) return 11;
      if (shortName.startsWith('Z')) return 10;
      
      const num = parseInt(shortName);
      if (isNaN(num)) return 12;

      if (num < 200) return 0;
      if (num < 300) return 1;
      if (num < 400) return 2;
      if (num < 500) return 3;
      if (num < 600) return 4;
      if (num < 700) return 5;
      if (num < 800) return 6;
      if (num < 900) return 7;
      if (num < 1000) return 8;
      
      return 9;
    };

    const priorityA = getPriority(a.shortName);
    const priorityB = getPriority(b.shortName);

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    return a.shortName.localeCompare(b.shortName, undefined, { numeric: true, sensitivity: 'base' });
  }

  const selectedRoute = useMemo(() => 
    routes.find(r => r.id === selectedRouteId) || null
  , [routes, selectedRouteId]);

  const handleToggleRoute = (routeId: string) => {
    onRouteSelect(selectedRouteId === routeId ? null : routeId);
  };

  return (
    <div 
      className="fixed left-6 top-[100px] bottom-6 z-30 flex items-center pointer-events-none"
      role="complementary"
      aria-label="Bus Routes Overlay"
    >
      <div className="relative flex items-center h-full">
        <motion.div
          initial={false}
          animate={{ 
            width: isExpanded ? "400px" : "0px",
            opacity: isExpanded ? 1 : 0,
            x: isExpanded ? 0 : -40
          }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "border rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col h-full pointer-events-auto overflow-hidden relative transition-colors duration-300",
            isDark ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"
          )}
        >
          {/* Handle bar for "Sheet" feel */}
          <div className={cn(
            "absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full z-50",
            isDark ? "bg-neutral-800" : "bg-neutral-100"
          )} />

          <div className="relative flex-1 overflow-hidden">
            <AnimatePresence initial={false} mode="wait">
              {!selectedRouteId ? (
                <motion.div
                  key="list"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="absolute inset-0 flex flex-col"
                >
                  {/* Contextual Header */}
                  <div className="pt-8 px-8 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className={cn(
                          "text-xl font-black leading-tight tracking-tight",
                          isDark ? "text-neutral-50" : "text-neutral-900"
                        )}>
                          {searchTerm ? "Search Results" : "All Lines"}
                        </h2>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">
                          {searchTerm ? `${filteredRoutes.length} lines found` : `${routes.length} lines in network`}
                        </p>
                      </div>
                      <button 
                        className="p-2.5 text-neutral-400 hover:text-brand-primary hover:bg-brand-primary/5 rounded-xl transition-all cursor-pointer"
                        aria-label="Filter routes"
                      >
                        <Filter size={18} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>

                  {/* List Content */}
                  <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center h-full gap-4 text-neutral-500">
                        <Loader2 className="animate-spin text-brand-primary" size={32} strokeWidth={3} />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Syncing Network</p>
                      </div>
                    ) : filteredRoutes.length > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        {filteredRoutes.map(route => (
                          <RouteItem
                            key={route.id}
                            route={route}
                            isSelected={false}
                            onToggle={handleToggleRoute}
                            isDark={isDark}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-6 text-neutral-400 px-8 text-center">
                        <Bus size={32} className="opacity-10" strokeWidth={3} />
                        <div>
                          <p className="text-sm font-black uppercase tracking-tight">No matches found</p>
                          <p className="text-[11px] mt-2 font-medium opacity-60">Try searching for a different line number or destination name</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className={cn(
                    "p-6 border-t flex justify-between items-center px-8 transition-colors duration-300",
                    isDark ? "border-neutral-800/50 bg-neutral-800/10" : "border-neutral-100/50 bg-neutral-50/30"
                  )}>
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.1em]">
                      {filteredRoutes.length} <span className="font-medium opacity-60 ml-1">Lines</span>
                    </span>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-wider",
                        isDark ? "text-green-400" : "text-green-600"
                      )}>
                        Live Data
                      </span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="detail"
                  initial={{ x: "100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "100%", opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 bg-inherit"
                >
                  {selectedRoute && (
                    <RouteDetail 
                      route={selectedRoute} 
                      onBack={() => onRouteSelect(null)} 
                      isDark={isDark}
                      selectedBusId={selectedBus?.id}
                      busPosition={selectedBus ? positions.find(p => p.id === selectedBus.id) || null : null}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Toggle Button */}
        <button
          onClick={onToggleExpand}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-8 h-12 border shadow-xl pointer-events-auto flex items-center justify-center text-neutral-400 hover:text-brand-primary transition-all group z-40 focus:outline-none rounded-xl cursor-pointer",
            isDark ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200",
            isExpanded ? "-right-4" : "-left-1"
          )}
          aria-label={isExpanded ? "Collapse dashboard" : "Expand dashboard"}
        >
          {isExpanded ? <ChevronLeft size={20} strokeWidth={3} /> : <ChevronRight size={20} strokeWidth={3} />}
        </button>
      </div>
    </div>
  );
};

