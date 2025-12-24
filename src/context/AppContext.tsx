import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useBusPositions } from "@/hooks/useBusPositions";
import { gtfsService } from "@/services/gtfsService";
import { SelectedBus, BusPosition } from "@/types/bus";
import { detectBusDirection } from "@/lib/busUtils";
import { MAP_STYLES, MapStyleUrl } from "@/constants/mapStyles";
import { BusDirection } from "@/enums/direction";

interface AppContextType {
  selectedRouteId: string | null;
  selectedBus: SelectedBus | null;
  searchTerm: string;
  isDashboardExpanded: boolean;
  activeDirection: BusDirection;
  activeGroup: string | null;
  selectedLines: string[];
  totalRoutesCount: number;
  positions: BusPosition[];
  mapStyle: MapStyleUrl;
  handleBusSelect: (bus: SelectedBus | null) => void;
  handleRouteSelect: (routeId: string | null) => void;
  handleSearchChange: (value: string) => void;
  handleClearSearch: () => void;
  handleToggleExpand: () => void;
  handleSwitchBusForDirection: (direction: BusDirection) => Promise<void>;
  setActiveDirection: (direction: BusDirection) => void;
  setActiveGroup: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedLines: React.Dispatch<React.SetStateAction<string[]>>;
  setMapStyle: (style: MapStyleUrl) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedBus, setSelectedBus] = useState<SelectedBus | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDashboardExpanded, setIsDashboardExpanded] = useState(true);
  const [activeDirection, setActiveDirection] = useState<BusDirection>(BusDirection.OUTBOUND);
  
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [totalRoutesCount, setTotalRoutesCount] = useState<number>(0);
  const [mapStyle, setMapStyle] = useState<MapStyleUrl>(MAP_STYLES.VOYAGER.url);
  
  const { positions } = useBusPositions();

  useEffect(() => {
    const fetchTotalRoutes = async () => {
      const routes = await gtfsService.fetchRoutes();
      setTotalRoutesCount(routes.length);
    };
    fetchTotalRoutes();
  }, []);

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

  const handleSwitchBusForDirection = useCallback(async (direction: BusDirection) => {
    if (!selectedRouteId) {
      return;
    }

    const currentLine = selectedBus?.line || positions.find(p => p.id === selectedBus?.id)?.line;
    const busesOnRoute = currentLine 
      ? positions.filter(bus => bus.line === currentLine)
      : positions;

    let foundBus = false;
    for (const bus of busesOnRoute) {
      if (selectedBus && bus.id === selectedBus.id) continue;

      try {
        const busDirection = await detectBusDirection(
          { latitude: bus.latitude, longitude: bus.longitude, bearing: bus.bearing },
          selectedRouteId
        );

        if (busDirection === direction) {
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

    if (!foundBus) {
      setSelectedBus(null);
    }
  }, [selectedBus, selectedRouteId, positions]);

  const value = {
    selectedRouteId,
    selectedBus,
    searchTerm,
    isDashboardExpanded,
    activeDirection,
    activeGroup,
    selectedLines,
    totalRoutesCount,
    positions,
    mapStyle,
    handleBusSelect,
    handleRouteSelect,
    handleSearchChange,
    handleClearSearch,
    handleToggleExpand,
    handleSwitchBusForDirection,
    setActiveDirection,
    setActiveGroup,
    setSelectedLines,
    setMapStyle,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};

