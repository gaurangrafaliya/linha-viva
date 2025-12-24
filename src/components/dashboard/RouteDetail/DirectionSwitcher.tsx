import { cn } from "@/lib/utils";
import { BusDirection } from "@/enums/direction";
import { useRouteDetailContext } from "@/context/RouteDetailContext";

export const DirectionSwitcher = () => {
  const { activeDirection, directionLabels, handleDirectionSelect } = useRouteDetailContext();
  
  return (
    <div className="px-6 pb-4">
      <div className="flex p-1 rounded-xl bg-neutral-100">
        <button
          onClick={() => handleDirectionSelect(BusDirection.OUTBOUND)}
          className={cn(
            "flex-1 py-2 px-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer truncate",
            activeDirection === BusDirection.OUTBOUND 
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-400 hover:text-neutral-600"
          )}
          title={directionLabels.direction0}
        >
          {directionLabels.direction0}
        </button>
        <button
          onClick={() => handleDirectionSelect(BusDirection.INBOUND)}
          className={cn(
            "flex-1 py-2 px-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer truncate",
            activeDirection === BusDirection.INBOUND 
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-400 hover:text-neutral-600"
          )}
          title={directionLabels.direction1}
        >
          {directionLabels.direction1}
        </button>
      </div>
    </div>
  );
};
