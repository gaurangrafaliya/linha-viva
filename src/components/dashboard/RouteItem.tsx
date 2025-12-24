import { GTFSRoute } from "@/types/gtfs";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface RouteItemProps {
  route: GTFSRoute;
  isSelected: boolean;
  onToggle: (routeId: string) => void;
}

export const RouteItem = ({ route, isSelected, onToggle }: RouteItemProps) => {
  const handleToggle = () => {
    onToggle(route.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  const routeColor = route.color ? `#${route.color}` : 'var(--color-brand-primary)';
  const routeTextColor = route.textColor ? `#${route.textColor}` : '#ffffff';

  return (
    <div 
      className={cn(
        "group rounded-xl transition-all duration-300",
        isSelected 
          ? "bg-neutral-50 border border-neutral-200 shadow-sm"
          : "hover:bg-neutral-50"
      )}
    >
      <button
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="w-full flex items-center gap-3 p-3 text-left focus:outline-none rounded-xl cursor-pointer"
        aria-label={`Bus route ${route.shortName}: ${route.longName}`}
      >
        <div 
          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm shadow-sm transition-transform duration-300"
          style={{ backgroundColor: routeColor, color: routeTextColor }}
        >
          {route.shortName}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-black truncate leading-tight tracking-tight text-neutral-800">
            {route.longName}
          </h3>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5 truncate">
            {route.desc || "Regular Route"}
          </p>
        </div>

        <div className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-300 group-hover:text-brand-primary group-hover:translate-x-0.5 transition-all">
          <ChevronRight size={18} strokeWidth={3} />
        </div>
      </button>
    </div>
  );
};

