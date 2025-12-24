import { cn } from "@/lib/utils";
import { GTFSStop } from "@/types/gtfs";
import { forwardRef } from "react";

interface StopTimelineItemProps {
  stop: GTFSStop;
  index: number;
  isPassed: boolean;
  isNext: boolean;
  isTerminal: boolean;
  delayStatus: { status: 'on-time' | 'late'; delayMinutes: number; scheduledTime: string; estimatedTime: string } | null;
}

export const StopTimelineItem = forwardRef<HTMLDivElement, StopTimelineItemProps>(
  ({ stop, index, isPassed, isNext, isTerminal, delayStatus }, ref) => (
    <div 
      ref={ref}
      className={cn(
        "flex items-start gap-4 relative group transition-all",
        isNext && "bg-brand-primary/10 rounded-lg p-2 -mx-2"
      )}
    >
      <div className="relative z-10 mt-1.5">
        <div 
          className={cn(
            "w-[24px] h-[24px] rounded-full flex items-center justify-center border-4 transition-transform group-hover:scale-110 bg-white border-neutral-100",
            isTerminal && "border-brand-primary",
            isNext && "border-brand-primary ring-2 ring-brand-primary/50",
            isPassed && !isNext && "bg-brand-primary/10 border-brand-primary/30"
          )}
        >
          <div className={cn(
            "w-1.5 h-1.5 rounded-full transition-colors",
            (isTerminal || isNext || isPassed) ? "bg-brand-primary" : "bg-neutral-300",
            "group-hover:bg-brand-primary"
          )} />
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn(
            "text-[12px] font-bold leading-tight transition-colors text-neutral-700 group-hover:text-neutral-900",
            isNext && "text-brand-primary",
            isPassed && !isNext && "opacity-60"
          )}>
            {stop.name}
            {isNext && <span className="ml-2 text-[10px] text-brand-primary/70">● Next</span>}
            {isPassed && !isNext && <span className="ml-2 text-[10px] text-neutral-400">✓ Passed</span>}
          </p>
          {isNext && delayStatus && (
            <div className="flex items-center gap-1.5 leading-none">
              {delayStatus.status === 'late' && (
                <span className="text-[11px] font-medium line-through opacity-40 text-neutral-500">
                  {delayStatus.scheduledTime}
                </span>
              )}
              <span className="text-[12px] font-bold text-neutral-900">
                {delayStatus.status === 'on-time' ? delayStatus.scheduledTime : delayStatus.estimatedTime}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-[9px] font-medium text-neutral-400 opacity-60">Stop ID: {stop.id}</span>
          {isNext && delayStatus && (
            <span className={cn(
              "text-[10px] font-black uppercase tracking-wider whitespace-nowrap",
              delayStatus.status === 'on-time' 
                ? "text-green-600"
                : "text-orange-600"
            )}>
              {delayStatus.status === 'on-time' ? 'On Time' : `Late ${delayStatus.delayMinutes} mins`}
            </span>
          )}
        </div>
      </div>
    </div>
  )
);

StopTimelineItem.displayName = "StopTimelineItem";

