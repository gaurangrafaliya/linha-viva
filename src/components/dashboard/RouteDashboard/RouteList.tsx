import { motion } from "framer-motion";
import { Filter, Loader2, Bus } from "lucide-react";
import { cn } from "@/lib/utils";
import { GTFSRoute } from "@/types/gtfs";
import { RouteItem } from "../RouteItem";
import { useAppContext } from "@/context/AppContext";
import { useDashboardContext } from "@/context/DashboardContext";
import { FilterPanel } from "./FilterPanel";

interface RouteListProps {
  routes: GTFSRoute[];
  filteredRoutes: GTFSRoute[];
  loading: boolean;
}

export const RouteList = ({ routes, filteredRoutes, loading }: RouteListProps) => {
  const { searchTerm, selectedLines, handleRouteSelect, selectedRouteId } = useAppContext();
  const { isFilterPanelOpen, handleToggleFilterPanel } = useDashboardContext();
  
  const isFilterActive = selectedLines.length > 0;

  const handleToggleRoute = (routeId: string) => {
    handleRouteSelect(selectedRouteId === routeId ? null : routeId);
  };

  return (
    <motion.div
      key="list"
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -20, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="absolute inset-0 flex flex-col"
    >
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

        <FilterPanel routes={routes} />
      </div>

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

      <div className="p-6 border-t px-8 transition-colors duration-300 border-neutral-100/50 bg-neutral-50/30">
        <div className="flex justify-between items-center w-full">
          <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
            {filteredRoutes.length} <span className="font-medium opacity-60 ml-1">Lines</span>
          </span>
          <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400">
            Data provided by STCP
          </span>
        </div>
      </div>
    </motion.div>
  );
};

