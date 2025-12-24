import { Bus, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouteDetailContext } from "@/context/RouteDetailContext";
import { useAppContext } from "@/context/AppContext";

export const ActiveBusesList = () => {
  const { currentDirectionBuses, route, onBusSelect } = useRouteDetailContext();
  const { selectedBus } = useAppContext();
  const selectedBusId = selectedBus?.id;

  return (
    <div className="px-6 pb-4">
      <div className="p-3 rounded-xl border flex flex-col gap-2 bg-neutral-50 border-neutral-100">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">
            Buses in this direction
          </span>
          <span className={cn(
            "text-[9px] font-black px-1.5 py-0.5 rounded-full",
            currentDirectionBuses.length > 0
              ? "bg-brand-primary/10 text-brand-primary"
              : "bg-orange-500/10 text-orange-500"
          )}>
            {currentDirectionBuses.length} ACTIVE
          </span>
        </div>
        
        {currentDirectionBuses.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {currentDirectionBuses.map(bus => (
              <button
                key={bus.id}
                onClick={() => onBusSelect?.({ id: bus.id, line: bus.line, routeId: route.id })}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer",
                  selectedBusId === bus.id
                    ? "bg-brand-primary border-brand-primary text-white shadow-md scale-105"
                    : "bg-white border-neutral-200 text-neutral-500 hover:text-neutral-700"
                )}
              >
                <Bus size={12} strokeWidth={selectedBusId === bus.id ? 3 : 2} />
                <span className="text-[10px] font-black">
                  {bus.id.split(':').pop() || bus.id}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-1">
            <Info size={14} className="text-orange-500/50" />
            <p className="text-[10px] font-bold text-neutral-400">No active buses on this direction</p>
          </div>
        )}
      </div>
    </div>
  );
};
