import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, MapPin, Loader2, Info, ExternalLink } from "lucide-react";
import { GTFSRoute, GTFSStop } from "@/types/gtfs";
import { gtfsService } from "@/services/gtfsService";
import { cn } from "@/lib/utils";

interface RouteDetailProps {
  route: GTFSRoute;
  onBack: () => void;
  isDark?: boolean;
}

export const RouteDetail = ({ route, onBack, isDark = false }: RouteDetailProps) => {
  const [stops, setStops] = useState<{ direction0: GTFSStop[], direction1: GTFSStop[] }>({ direction0: [], direction1: [] });
  const [loading, setLoading] = useState(true);
  const [activeDirection, setActiveDirection] = useState<0 | 1>(0);

  useEffect(() => {
    const loadStops = async () => {
      setLoading(true);
      const data = await gtfsService.fetchStopsForRoute(route.id);
      setStops(data);
      setLoading(false);
    };
    loadStops();
  }, [route.id]);

  const currentStops = activeDirection === 0 ? stops.direction0 : stops.direction1;
  const routeColor = route.color ? `#${route.color}` : 'var(--color-brand-primary)';
  const routeTextColor = route.textColor ? `#${route.textColor}` : '#ffffff';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="pt-8 px-6 pb-6">
        <button 
          onClick={onBack}
          className={cn(
            "flex items-center gap-2 mb-6 px-3 py-1.5 rounded-lg transition-colors group cursor-pointer",
            isDark ? "hover:bg-neutral-800 text-neutral-400" : "hover:bg-neutral-100 text-neutral-500"
          )}
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">Back to lines</span>
        </button>

        <div className="flex items-start gap-4">
          <div 
            className="shrink-0 w-14 h-14 rounded-xl flex items-center justify-center font-black text-xl shadow-lg"
            style={{ backgroundColor: routeColor, color: routeTextColor }}
          >
            {route.shortName}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className={cn(
              "text-lg font-black leading-tight tracking-tight",
              isDark ? "text-neutral-50" : "text-neutral-900"
            )}>
              {route.longName}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[9px] font-black uppercase tracking-widest">
                Active Now
              </span>
              {route.url && (
                <a 
                  href={route.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 transition-colors"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Direction Switcher */}
      <div className="px-6 pb-4">
        <div className={cn(
          "flex p-1 rounded-xl",
          isDark ? "bg-neutral-800/50" : "bg-neutral-100"
        )}>
          <button
            onClick={() => setActiveDirection(0)}
            className={cn(
              "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer",
              activeDirection === 0 
                ? (isDark ? "bg-neutral-700 text-white shadow-sm" : "bg-white text-neutral-900 shadow-sm")
                : "text-neutral-400 hover:text-neutral-600"
            )}
          >
            Outbound
          </button>
          <button
            onClick={() => setActiveDirection(1)}
            className={cn(
              "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer",
              activeDirection === 1 
                ? (isDark ? "bg-neutral-700 text-white shadow-sm" : "bg-white text-neutral-900 shadow-sm")
                : "text-neutral-400 hover:text-neutral-600"
            )}
          >
            Inbound
          </button>
        </div>
      </div>

      {/* Stops List */}
      <div className="flex-1 overflow-y-auto px-6 pb-8 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-neutral-500 py-20">
            <Loader2 className="animate-spin text-brand-primary" size={24} strokeWidth={3} />
            <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Loading stops</p>
          </div>
        ) : currentStops.length > 0 ? (
          <div className="relative pt-2">
            {/* Timeline Line */}
            <div 
              className={cn(
                "absolute left-[11px] top-6 bottom-6 w-0.5",
                isDark ? "bg-neutral-800" : "bg-neutral-100"
              )} 
            />

            <div className="space-y-6">
              {currentStops.map((stop, index) => (
                <div key={`${stop.id}-${index}`} className="flex items-start gap-4 relative group">
                  <div className="relative z-10 mt-1.5">
                    <div 
                      className={cn(
                        "w-[24px] h-[24px] rounded-full flex items-center justify-center border-4 transition-transform group-hover:scale-110",
                        isDark ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-100",
                        index === 0 || index === currentStops.length - 1 ? "border-brand-primary" : ""
                      )}
                    >
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full transition-colors",
                        index === 0 || index === currentStops.length - 1 ? "bg-brand-primary" : (isDark ? "bg-neutral-700" : "bg-neutral-300"),
                        "group-hover:bg-brand-primary"
                      )} />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-[12px] font-bold leading-tight transition-colors",
                      isDark ? "text-neutral-200 group-hover:text-white" : "text-neutral-700 group-hover:text-neutral-900"
                    )}>
                      {stop.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-medium text-neutral-400 opacity-60">Stop ID: {stop.id}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-neutral-400 py-20 text-center">
            <Info size={24} className="opacity-20" />
            <p className="text-[11px] font-medium">No stop information available for this direction.</p>
          </div>
        )}
      </div>
    </div>
  );
};

