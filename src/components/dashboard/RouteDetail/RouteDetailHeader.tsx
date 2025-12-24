import { ChevronLeft, ExternalLink } from "lucide-react";
import { useRouteDetailContext } from "@/context/RouteDetailContext";

export const RouteDetailHeader = () => {
  const { route, onBack, routeColor, routeTextColor } = useRouteDetailContext();
  
  return (
    <div className="pt-8 px-6 pb-6">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 mb-6 px-3 py-1.5 rounded-lg transition-colors group cursor-pointer hover:bg-neutral-100 text-neutral-500"
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
          <h2 className="text-lg font-black leading-tight tracking-tight text-neutral-900">
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
  );
};
