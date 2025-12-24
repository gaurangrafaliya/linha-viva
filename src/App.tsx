import { useState, useEffect, useMemo, useCallback } from "react";
import { MapContainer } from "@/components/map/MapContainer";
import { MapSettings } from "@/components/map/MapSettings";
import { RouteDashboard } from "@/components/dashboard/RouteDashboard";
import { FloatingSearch } from "@/components/dashboard/FloatingSearch";
import { MAP_STYLES, MapStyleId } from "@/constants/mapStyles";
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
  const [currentStyleId, setCurrentStyleId] = useState<MapStyleId>('VOYAGER');
  const [selectedBus, setSelectedBus] = useState<SelectedBus | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDashboardExpanded, setIsDashboardExpanded] = useState(true);
  const [activeDirection, setActiveDirection] = useState<0 | 1>(0);
  const { positions } = useBusPositions();
  
  const currentStyle = MAP_STYLES[currentStyleId];

  // Sync theme with the HTML element for global Tailwind support
  useEffect(() => {
    if (currentStyle.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [currentStyle.theme]);

  const handleStyleChange = (styleId: MapStyleId) => {
    setCurrentStyleId(styleId);
  };

  const handleBusSelect = (bus: SelectedBus | null) => {
    setSelectedBus(bus);
    if (bus) setIsDashboardExpanded(true);
  };

  const handleRouteSelect = (routeId: string | null) => {
    setSelectedBus(null);
    if (routeId) setIsDashboardExpanded(true);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setSelectedBus(null);
  };

  const handleSwitchBusForDirection = useCallback(async (direction: 0 | 1) => {
    if (!selectedBus?.routeId || !selectedBus?.line) {
      return;
    }

    // Find all buses on the same route
    const busesOnRoute = positions.filter(bus => bus.line === selectedBus.line);
    if (busesOnRoute.length === 0) {
      return;
    }

    // Detect direction for each bus and find one going in the requested direction
    for (const bus of busesOnRoute) {
      // Skip the currently selected bus
      if (bus.id === selectedBus.id) continue;

      try {
        const busDirection = await detectBusDirection(
          { latitude: bus.latitude, longitude: bus.longitude, bearing: bus.bearing },
          selectedBus.routeId
        );

        if (busDirection === direction) {
          // Found a bus going in the requested direction
          const newBus = {
            id: bus.id,
            line: bus.line,
            routeId: selectedBus.routeId
          };
          setSelectedBus(newBus);
          return;
        }
      } catch (error) {
        console.error('Error detecting bus direction:', error);
      }
    }
  }, [selectedBus, positions]);

  return (
    <main 
      className={cn(
        "relative w-full h-screen overflow-hidden transition-colors duration-500",
        currentStyle.theme === 'dark' ? "bg-neutral-950" : "bg-white"
      )}
      aria-label="Porto Bus Live Visualization Map"
    >
      <MapContainer 
        styleUrl={currentStyle.url} 
        onSelectBus={handleBusSelect}
        selectedBus={selectedBus}
        onSelectRoute={handleRouteSelect}
        theme={currentStyle.theme}
        isDashboardExpanded={isDashboardExpanded}
        activeDirection={activeDirection}
      />
      
      <FloatingSearch 
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onClear={handleClearSearch}
        theme={currentStyle.theme}
        isExpanded={isDashboardExpanded}
      />

      <div 
        className="absolute top-6 right-6 z-40 pointer-events-none"
        role="complementary"
        aria-label="Map Controls"
      >
        <MapSettings 
          currentStyleId={currentStyle.id} 
          onStyleChange={handleStyleChange} 
          theme={currentStyle.theme}
        />
      </div>

      <RouteDashboard 
        selectedRouteId={selectedBus?.routeId || null}
        selectedBus={selectedBus}
        onRouteSelect={handleRouteSelect}
        onBusSelect={handleBusSelect}
        searchTerm={searchTerm}
        theme={currentStyle.theme}
        isExpanded={isDashboardExpanded}
        onToggleExpand={() => {
          const newExpanded = !isDashboardExpanded;
          setIsDashboardExpanded(newExpanded);
          if (!newExpanded) {
            setSelectedBus(null);
          }
        }}
        onDirectionChange={setActiveDirection}
        onSwitchBusForDirection={handleSwitchBusForDirection}
      />
    </main>
  );
};

export default App;

