import { useState, useEffect, useMemo, useCallback } from "react";
import { MapContainer } from "@/components/map/MapContainer";
import { RouteDashboard } from "@/components/dashboard/RouteDashboard";
import { FloatingSearch } from "@/components/dashboard/FloatingSearch";
import { MAP_STYLES } from "@/constants/mapStyles";
import { cn } from "@/lib/utils";
import { useBusPositions } from "@/hooks/useBusPositions";
import { gtfsService } from "@/services/gtfsService";
import { GTFSStop } from "@/types/gtfs";

interface SelectedBus {
  id: string;
  line: string;
  routeId: string | null;
}

// Helper function to calculate distance
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

// Detect bus direction based on position and route stops
const detectBusDirection = async (
  busPosition: { latitude: number; longitude: number; bearing?: number },
  routeId: string
): Promise<0 | 1> => {
  const [stopsData] = await Promise.all([
    gtfsService.fetchStopsForRoute(routeId)
  ]);

  const { direction0, direction1 } = stopsData;
  if (direction0.length === 0 || direction1.length === 0) return 0;

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

  const dir0 = findNearestInDirection(direction0);
  const dir1 = findNearestInDirection(direction1);

  // Determine direction based on bearing alignment if available
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

    if (dir1Aligned && !dir0Aligned) return 1;
    if (dir0Aligned && !dir1Aligned) return 0;
  }

  // Fallback to closest distance
  return dir1.distance < dir0.distance ? 1 : 0;
};

const App = () => {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedBus, setSelectedBus] = useState<SelectedBus | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDashboardExpanded, setIsDashboardExpanded] = useState(true);
  const [activeDirection, setActiveDirection] = useState<0 | 1>(0);
  const { positions } = useBusPositions();
  
  const currentStyle = MAP_STYLES.VOYAGER;

  const handleBusSelect = useCallback((bus: SelectedBus | null) => {
    setSelectedBus(bus);
    if (bus) {
      setSelectedRouteId(bus.routeId);
      setIsDashboardExpanded(true);
    }
  }, []);

  const handleRouteSelect = useCallback((routeId: string | null) => {
    setSelectedRouteId(routeId);
    setSelectedBus(null);
    if (routeId) setIsDashboardExpanded(true);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
    setSelectedBus(null);
    setSelectedRouteId(null);
  }, []);

  const handleToggleExpand = useCallback(() => {
    setIsDashboardExpanded(prev => {
      const newExpanded = !prev;
      if (!newExpanded) {
        setSelectedBus(null);
        setSelectedRouteId(null);
      }
      return newExpanded;
    });
  }, []);

  const handleSwitchBusForDirection = useCallback(async (direction: 0 | 1) => {
    if (!selectedRouteId) {
      return;
    }

    // Try to find the line name from selectedBus or positions
    const currentLine = selectedBus?.line || positions.find(p => p.id === selectedBus?.id)?.line;
    
    // Find all buses on the same route if we have a line name
    const busesOnRoute = currentLine 
      ? positions.filter(bus => bus.line === currentLine)
      : positions; // Fallback to all positions if no line name yet

    let foundBus = false;
    for (const bus of busesOnRoute) {
      // Skip the currently selected bus if it's the same
      if (selectedBus && bus.id === selectedBus.id) continue;

      try {
        const busDirection = await detectBusDirection(
          { latitude: bus.latitude, longitude: bus.longitude, bearing: bus.bearing },
          selectedRouteId
        );

        if (busDirection === direction) {
          // Found a bus going in the requested direction
          const newBus = {
            id: bus.id,
            line: bus.line,
            routeId: selectedRouteId
          };
          setSelectedBus(newBus);
          foundBus = true;
          return;
        }
      } catch (error) {
        // Not on this route
      }
    }

    // If we reach here, no bus was found in the requested direction
    if (!foundBus) {
      setSelectedBus(null);
    }
  }, [selectedBus, selectedRouteId, positions]);

  return (
    <main 
      className="relative w-full h-screen overflow-hidden transition-colors duration-500 bg-white"
      aria-label="Porto Bus Live Visualization Map"
    >
      <MapContainer 
        styleUrl={currentStyle.url} 
        onSelectBus={handleBusSelect}
        selectedBus={selectedBus}
        selectedRouteId={selectedRouteId}
        onSelectRoute={handleRouteSelect}
        isDashboardExpanded={isDashboardExpanded}
        activeDirection={activeDirection}
      />
      
      <FloatingSearch 
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onClear={handleClearSearch}
        isExpanded={isDashboardExpanded}
      />

      <RouteDashboard 
        selectedRouteId={selectedRouteId}
        selectedBus={selectedBus}
        onRouteSelect={handleRouteSelect}
        onBusSelect={handleBusSelect}
        searchTerm={searchTerm}
        isExpanded={isDashboardExpanded}
        onToggleExpand={handleToggleExpand}
        onDirectionChange={setActiveDirection}
        onSwitchBusForDirection={handleSwitchBusForDirection}
      />
    </main>
  );
};

export default App;


