import { useState, useEffect, useMemo, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Bus, ChevronLeft, ChevronRight, Filter, Check } from "lucide-react";
import { GTFSRoute } from "@/types/gtfs";
import { gtfsService } from "@/services/gtfsService";
import { RouteItem } from "./RouteItem";
import { RouteDetail } from "./RouteDetail";
import { cn } from "@/lib/utils";
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
  onBusSelect: (bus: SelectedBus | null) => void;
  searchTerm: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDirectionChange?: (direction: 0 | 1) => void;
  onSwitchBusForDirection?: (direction: 0 | 1) => void;
  
  // Filter Props
  activeGroup: string | null;
  setActiveGroup: (val: string | null | ((prev: string | null) => string | null)) => void;
  selectedLines: string[];
  setSelectedLines: (val: string[] | ((prev: string[]) => string[])) => void;
}

const LINE_GROUPS = ["200", "300", "400", "500", "600", "700", "800", "900", "Night", "Zonal"];

export const RouteDashboard = memo(({ 
  selectedRouteId, 
  selectedBus,
  onRouteSelect, 
  onBusSelect,
  searchTerm, 
  isExpanded,
  onToggleExpand,
  onDirectionChange,
  onSwitchBusForDirection,
  activeGroup,
  setActiveGroup,
  selectedLines,
  setSelectedLines
}: RouteDashboardProps) => {
  const [routes, setRoutes] = useState<GTFSRoute[]>([]);
  const [stops, setStops] = useState<Record<string, string[]>>({}); // routeId -> stopNames[]
  const [loading, setLoading] = useState(true);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const { positions } = useBusPositions();

  const isFilterActive = selectedLines.length > 0;

  const handleToggleGroup = (group: string) => {
    setActiveGroup(prev => prev === group ? null : group);
  };

  const handleToggleLineFilter = (shortName: string) => {
    setSelectedLines(prev => 
      prev.includes(shortName) 
        ? prev.filter(s => s !== shortName) 
        : [...prev, shortName]
    );
  };

  const handleToggleFilterPanel = () => {
    setIsFilterPanelOpen(prev => !prev);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  const lookupsRef = useRef<{
    stopsMap: Map<string, string>;
    tripStopMap: Map<string, Set<string>>;
    routeTripsMap: Map<string, Set<string>>;
    routeStopNamesMap: Map<string, Set<string>>;
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

      // Pre-calculate stop names per route for faster search
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

      const routeStops: Record<string, string[]> = {};

      lookupsRef.current = {
        stopsMap,
        tripStopMap,
        routeTripsMap,
        routeStopNamesMap,
      };

      setRoutes(routesData);
      setStops(routeStops);
      setLoading(false);
    };

    loadData();
  }, []);

  const activeLineNames = useMemo(() => new Set(positions.map(p => p.line)), [positions]);

  const filteredRoutes = useMemo(() => {
    let result = routes;

    // Apply Specific Line filters (Only if there are any selected)
    if (selectedLines.length > 0) {
      result = result.filter(route => selectedLines.includes(route.shortName));
    }

    const lowerSearch = debouncedSearchTerm.toLowerCase();

    if (debouncedSearchTerm) {
      const scoredResults = result
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
            const stopNames = lookupsRef.current.routeStopNamesMap.get(route.id);
            if (stopNames) {
              for (const name of stopNames) {
                if (name.includes(lowerSearch)) {
                  score = 100;
                  break;
                }
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
  }, [routes, debouncedSearchTerm, selectedLines, activeLineNames]);

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
          className="border rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col h-full pointer-events-auto overflow-hidden relative transition-colors duration-300 bg-white border-neutral-200"
        >
          {/* Handle bar for "Sheet" feel */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full z-50 bg-neutral-100" />

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
                        <h2 className="text-xl font-black leading-tight tracking-tight text-neutral-900">
                          {searchTerm || isFilterActive ? "Filtered Lines" : "All Lines"}
                        </h2>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">
                          {searchTerm || isFilterActive 
                            ? `${filteredRoutes.length} lines found` 
                            : `${routes.length} lines in network`}
                        </p>
                      </div>
                      <button 
                        onClick={handleToggleFilterPanel}
                        className={cn(
                          "p-2.5 rounded-xl transition-all cursor-pointer relative",
                          isFilterPanelOpen || isFilterActive 
                            ? "text-brand-primary bg-brand-primary/10" 
                            : "text-neutral-400 hover:text-brand-primary hover:bg-brand-primary/5"
                        )}
                        aria-label="Filter routes"
                        aria-expanded={isFilterPanelOpen}
                      >
                        <Filter size={18} strokeWidth={2.5} />
                        {isFilterActive && (
                          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-primary rounded-full border-2 border-white" />
                        )}
                      </button>
                    </div>

                    <AnimatePresence>
                      {isFilterPanelOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden mt-4"
                        >
                          <div className="flex flex-col gap-4 pb-2">
                            {/* Line Groups */}
                            <div className="flex flex-col gap-2">
                              <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 px-1">Browse Groups</span>
                              <div className="flex flex-wrap gap-1.5">
                                {LINE_GROUPS.map(group => (
                                  <button
                                    key={group}
                                    onClick={() => handleToggleGroup(group)}
                                    className={cn(
                                      "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all",
                                      activeGroup === group
                                        ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                                        : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                                    )}
                                  >
                                    {group}{!isNaN(parseInt(group)) ? 's' : ''}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Group Selection Area */}
                            <AnimatePresence>
                              {activeGroup && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="flex flex-col gap-2 p-3 bg-neutral-50 rounded-xl border border-neutral-100"
                                >
                                  <div className="flex items-center justify-between px-1">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-primary">
                                      Select from {activeGroup}{!isNaN(parseInt(activeGroup)) ? 's' : ''}
                                    </span>
                                    <button 
                                      onClick={() => {
                                        const groupLines = routes.filter(r => {
                                          if (activeGroup === 'Night') return r.shortName.endsWith('M');
                                          if (activeGroup === 'Zonal') return r.shortName.startsWith('Z');
                                          const num = parseInt(r.shortName);
                                          const groupNum = parseInt(activeGroup);
                                          return !isNaN(num) && num >= groupNum && num < groupNum + 100;
                                        }).map(r => r.shortName);
                                        
                                        setSelectedLines(prev => {
                                          const allSelected = groupLines.every(l => prev.includes(l));
                                          if (allSelected) {
                                            return prev.filter(l => !groupLines.includes(l));
                                          }
                                          return Array.from(new Set([...prev, ...groupLines]));
                                        });
                                      }}
                                      className="text-[9px] font-black uppercase tracking-widest text-neutral-400 hover:text-brand-primary transition-colors"
                                    >
                                      Toggle All
                                    </button>
                                  </div>
                                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto custom-scrollbar p-1">
                                    {routes
                                      .filter(r => {
                                        if (activeGroup === 'Night') return r.shortName.endsWith('M');
                                        if (activeGroup === 'Zonal') return r.shortName.startsWith('Z');
                                        const num = parseInt(r.shortName);
                                        const groupNum = parseInt(activeGroup);
                                        return !isNaN(num) && num >= groupNum && num < groupNum + 100;
                                      })
                                      .sort(compareRoutes)
                                      .map(route => (
                                        <button
                                          key={route.id}
                                          onClick={() => handleToggleLineFilter(route.shortName)}
                                          className={cn(
                                            "px-2 py-1 rounded-md text-[9px] font-black transition-all border",
                                            selectedLines.includes(route.shortName)
                                              ? "bg-brand-primary border-brand-primary text-white"
                                              : "bg-white border-neutral-200 text-neutral-500 hover:border-brand-primary/30"
                                          )}
                                        >
                                          {route.shortName}
                                        </button>
                                      ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Specific Selected Lines */}
                            {selectedLines.length > 0 && (
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between px-1">
                                  <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500">Your Selection</span>
                                  <button 
                                    onClick={() => setSelectedLines([])}
                                    className="text-[9px] font-black uppercase tracking-widest text-neutral-400 hover:text-red-500 transition-colors"
                                  >
                                    Clear
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {selectedLines.map(line => (
                                    <button
                                      key={line}
                                      onClick={() => handleToggleLineFilter(line)}
                                      className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight bg-brand-primary text-white shadow-sm flex items-center gap-1"
                                    >
                                      {line}
                                      <Check size={10} strokeWidth={4} />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {isFilterActive && (
                              <button
                                onClick={() => {
                                  setActiveGroup(null);
                                  setSelectedLines([]);
                                }}
                                className="text-[10px] font-black uppercase tracking-widest text-brand-primary mt-2 text-center w-full py-2 bg-brand-primary/5 rounded-lg hover:bg-brand-primary/10 transition-colors"
                              >
                                Clear All Filters
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
                  <div className="p-6 border-t flex justify-between items-center px-8 transition-colors duration-300 border-neutral-100/50 bg-neutral-50/30">
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                      {filteredRoutes.length} <span className="font-medium opacity-60 ml-1">Lines</span>
                    </span>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[9px] font-black uppercase tracking-wider text-green-600">
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
                      selectedBusId={selectedBus?.id}
                      busPosition={selectedBus ? positions.find(p => p.id === selectedBus.id) || null : null}
                      allBusesOnRoute={positions.filter(p => p.line === selectedRoute.shortName)}
                      onBusSelect={onBusSelect}
                      onDirectionChange={onDirectionChange}
                      onSwitchBusForDirection={onSwitchBusForDirection}
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
            "absolute top-1/2 -translate-y-1/2 w-8 h-12 border shadow-xl pointer-events-auto flex items-center justify-center text-neutral-400 hover:text-brand-primary transition-all group z-40 focus:outline-none rounded-xl cursor-pointer bg-white border-neutral-200",
            isExpanded ? "-right-4" : "-left-1"
          )}
          aria-label={isExpanded ? "Collapse dashboard" : "Expand dashboard"}
        >
          {isExpanded ? <ChevronLeft size={20} strokeWidth={3} /> : <ChevronRight size={20} strokeWidth={3} />}
        </button>
      </div>
    </div>
  );
});
