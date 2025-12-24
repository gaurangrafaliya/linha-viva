import { useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "@/context/AppContext";
import { DashboardProvider } from "@/context/DashboardContext";
import { useDashboardData } from "@/hooks/dashboard/useDashboardData";
import { useRouteFiltering } from "@/hooks/dashboard/useRouteFiltering";
import { RouteDetail } from "./RouteDetail";
import { RouteList } from "./RouteDashboard/RouteList";
import { DashboardToggle } from "./RouteDashboard/DashboardToggle";

export const RouteDashboard = memo(() => {
  return (
    <DashboardProvider>
      <RouteDashboardContent />
    </DashboardProvider>
  );
});

const RouteDashboardContent = memo(() => {
  const {
    selectedRouteId,
    selectedBus,
    handleRouteSelect,
    searchTerm,
    isDashboardExpanded,
    setActiveDirection,
    handleSwitchBusForDirection,
    selectedLines,
    positions
  } = useAppContext();

  const { routes, loading, lookupsRef } = useDashboardData();
  const { filteredRoutes } = useRouteFiltering(routes, searchTerm, selectedLines, lookupsRef.current);

  const selectedRoute = useMemo(() => 
    routes.find(r => r.id === selectedRouteId) || null
  , [routes, selectedRouteId]);

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
            width: isDashboardExpanded ? "400px" : "0px",
            opacity: isDashboardExpanded ? 1 : 0,
            x: isDashboardExpanded ? 0 : -40
          }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="border rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col h-full pointer-events-auto overflow-hidden relative transition-colors duration-300 bg-white border-neutral-200"
        >
          {/* Handle bar for "Sheet" feel */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full z-50 bg-neutral-100" />

          <div className="relative flex-1 overflow-hidden">
            <AnimatePresence initial={false} mode="wait">
              {!selectedRouteId ? (
                <RouteList 
                  routes={routes} 
                  filteredRoutes={filteredRoutes} 
                  loading={loading} 
                />
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
                      onBack={() => handleRouteSelect(null)} 
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <DashboardToggle />
      </div>
    </div>
  );
});

RouteDashboard.displayName = 'RouteDashboard';
RouteDashboardContent.displayName = 'RouteDashboardContent';
