import React, { createContext, useContext, useMemo, ReactNode } from "react";
import { GTFSRoute, GTFSStop, GTFSTrip } from "@/types/gtfs";
import { BusDirection } from "@/enums/direction";
import { useRouteDetailData } from "@/hooks/dashboard/useRouteDetailData";
import { useDirectionManager } from "@/hooks/dashboard/useDirectionManager";
import { useRouteProgression } from "@/hooks/dashboard/useRouteProgression";
import { useAppContext } from "@/context/AppContext";
import { BusPosition } from "@/types/bus";

interface RouteDetailContextType {
  route: GTFSRoute;
  loading: boolean;
  stops: { direction0: GTFSStop[], direction1: GTFSStop[] };
  currentStops: GTFSStop[];
  activeDirection: BusDirection;
  directionLabels: { direction0: string; direction1: string };
  passedStops: Set<number>;
  nextStopIndex: number | null;
  delayStatus: { status: 'on-time' | 'late'; delayMinutes: number; scheduledTime: string; estimatedTime: string } | null;
  currentDirectionBuses: BusPosition[];
  routeColor: string;
  routeTextColor: string;
  handleDirectionSelect: (direction: BusDirection) => void;
  onBack: () => void;
  onBusSelect: (bus: { id: string; line: string; routeId: string | null }) => void;
}

const RouteDetailContext = createContext<RouteDetailContextType | undefined>(undefined);

interface RouteDetailProviderProps {
  children: ReactNode;
  route: GTFSRoute;
  onBack: () => void;
}

export const RouteDetailProvider = ({ children, route, onBack }: RouteDetailProviderProps) => {
  const {
    selectedBus,
    positions,
    setActiveDirection: setAppActiveDirection,
    handleSwitchBusForDirection,
    handleBusSelect: onBusSelect
  } = useAppContext();

  const selectedBusId = selectedBus?.id;
  const busPosition = selectedBus ? positions.find(p => p.id === selectedBus.id) || null : null;
  const allBusesOnRoute = useMemo(() => positions.filter(p => p.line === route.shortName), [positions, route.shortName]);

  const {
    stops,
    routeShapes,
    loading,
    trips,
    bestTrips,
    routeStopTimesMap
  } = useRouteDetailData(route.id);

  const {
    activeDirection,
    setActiveDirection,
    setIsManualDirection,
    busesByDirection
  } = useDirectionManager(
    selectedBusId,
    busPosition,
    stops,
    allBusesOnRoute,
    setAppActiveDirection
  );

  const currentStops = useMemo(() => 
    activeDirection === BusDirection.OUTBOUND ? stops.direction0 : stops.direction1,
    [activeDirection, stops]
  );

  const {
    passedStops,
    nextStopIndex,
    delayStatus
  } = useRouteProgression(
    selectedBusId,
    busPosition,
    currentStops,
    routeShapes,
    activeDirection,
    trips,
    routeStopTimesMap
  );

  const directionLabels = useMemo(() => {
    const getLabel = (dirStops: GTFSStop[], bestTrip: GTFSTrip | null) => {
      if (dirStops.length > 0) {
        const origin = dirStops[0]?.name;
        const destination = dirStops[dirStops.length - 1]?.name;
        if (origin && destination && origin !== destination) return `${origin} → ${destination}`;
      }
      return bestTrip?.headsign || (bestTrip?.directionId === BusDirection.OUTBOUND ? 'Outbound' : 'Inbound');
    };

    return {
      direction0: getLabel(stops.direction0, bestTrips.direction0),
      direction1: getLabel(stops.direction1, bestTrips.direction1)
    };
  }, [bestTrips, stops]);

  const routeColor = route.color ? `#${route.color}` : 'var(--color-brand-primary)';
  const routeTextColor = route.textColor ? `#${route.textColor}` : '#ffffff';

  const handleDirectionSelect = (direction: BusDirection) => {
    const directionChanged = activeDirection !== direction;
    setActiveDirection(direction);
    setIsManualDirection(true);
    if (directionChanged && handleSwitchBusForDirection) {
      handleSwitchBusForDirection(direction);
    }
  };

  const currentDirectionBuses = activeDirection === BusDirection.OUTBOUND 
    ? busesByDirection.direction0 
    : busesByDirection.direction1;

  const value = {
    route,
    loading,
    stops,
    currentStops,
    activeDirection,
    directionLabels,
    passedStops,
    nextStopIndex,
    delayStatus,
    currentDirectionBuses,
    routeColor,
    routeTextColor,
    handleDirectionSelect,
    onBack,
    onBusSelect
  };

  return <RouteDetailContext.Provider value={value}>{children}</RouteDetailContext.Provider>;
};

export const useRouteDetailContext = () => {
  const context = useContext(RouteDetailContext);
  if (context === undefined) {
    throw new Error("useRouteDetailContext must be used within a RouteDetailProvider");
  }
  return context;
};

