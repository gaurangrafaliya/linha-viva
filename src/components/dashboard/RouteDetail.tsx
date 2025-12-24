import { memo } from "react";
import { GTFSRoute } from "@/types/gtfs";
import { RouteDetailProvider } from "@/context/RouteDetailContext";
import { RouteDetailHeader } from "./RouteDetail/RouteDetailHeader";
import { DirectionSwitcher } from "./RouteDetail/DirectionSwitcher";
import { ActiveBusesList } from "./RouteDetail/ActiveBusesList";
import { StopTimeline } from "./RouteDetail/StopTimeline";

interface RouteDetailProps {
  route: GTFSRoute;
  onBack: () => void;
}

export const RouteDetail = memo(({ route, onBack }: RouteDetailProps) => {
  return (
    <RouteDetailProvider route={route} onBack={onBack}>
      <div className="flex flex-col h-full">
        <RouteDetailHeader />
        <DirectionSwitcher />
        <ActiveBusesList />
        <StopTimeline />
      </div>
    </RouteDetailProvider>
  );
});

RouteDetail.displayName = "RouteDetail";
