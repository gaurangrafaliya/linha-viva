import { useRef, useEffect } from "react";
import { Loader2, Info } from "lucide-react";
import { StopTimelineItem } from "./StopTimelineItem";
import { useRouteDetailContext } from "@/context/RouteDetailContext";
import { useAppContext } from "@/context/AppContext";

export const StopTimeline = () => {
  const { 
    currentStops, 
    loading, 
    passedStops, 
    nextStopIndex, 
    delayStatus, 
    currentDirectionBuses 
  } = useRouteDetailContext();
  
  const { selectedBus } = useAppContext();
  const selectedBusId = selectedBus?.id;

  const containerRef = useRef<HTMLDivElement>(null);
  const nextStopRef = useRef<HTMLDivElement>(null);
  const lastScrollIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (loading || nextStopIndex === null) return;
    if (lastScrollIndexRef.current === nextStopIndex) return;
    
    if (nextStopRef.current && containerRef.current) {
      const container = containerRef.current;
      const element = nextStopRef.current;
      
      requestAnimationFrame(() => {
        if (!nextStopRef.current || !containerRef.current) return;
        const targetScroll = element.offsetTop - (container.clientHeight * 0.3);
        container.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: 'smooth'
        });
        lastScrollIndexRef.current = nextStopIndex;
      });
    }
  }, [nextStopIndex, loading]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-neutral-500 py-20">
        <Loader2 className="animate-spin text-brand-primary" size={24} strokeWidth={3} />
        <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Loading stops</p>
      </div>
    );
  }

  if (currentStops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-neutral-400 py-20 text-center">
        <Info size={24} className="opacity-20" />
        <p className="text-[11px] font-medium">No stop information available for this direction.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-6 pb-8 custom-scrollbar">
      <div className="relative pt-2">
        <div className="absolute left-[11px] top-6 bottom-6 w-0.5 bg-neutral-100" />
        
        <div className="space-y-6">
          {!selectedBusId && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed mb-4 bg-neutral-50 border-neutral-200">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                <Info size={18} />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-black uppercase tracking-tight text-neutral-700">No bus selected</p>
                <p className="text-[10px] text-neutral-400 font-medium">
                  {currentDirectionBuses.length > 0 ? "Select a bus above to track its live progress" : "No buses currently active in this direction"}
                </p>
              </div>
            </div>
          )}
          
          {currentStops.map((stop, index) => (
            <StopTimelineItem
              key={`${stop.id}-${index}`}
              ref={nextStopIndex === index ? nextStopRef : null}
              stop={stop}
              index={index}
              isPassed={passedStops.has(index)}
              isNext={nextStopIndex === index}
              isTerminal={index === 0 || index === currentStops.length - 1}
              delayStatus={nextStopIndex === index ? delayStatus : null}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
