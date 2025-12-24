import { useState, memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bus, Flame, Clock, MapPin, Activity, ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import { BusPosition } from "@/types/bus";

export interface NetworkStatsProps {
  positions: BusPosition[];
  totalRoutesCount: number;
  loading?: boolean;
}

export const NetworkStats = memo(({ positions, totalRoutesCount, loading }: NetworkStatsProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const stats = useMemo(() => {
    if (positions.length === 0) return null;

    const lineCounts: Record<string, number> = {};
    let totalSpeed = 0;
    let speedCount = 0;
    let nightBuses = 0;

    positions.forEach(p => {
      lineCounts[p.line] = (lineCounts[p.line] || 0) + 1;
      if (p.speed && p.speed > 0) {
        totalSpeed += p.speed;
        speedCount++;
      }
      if (p.line.endsWith('M')) {
        nightBuses++;
      }
    });

    const activeLines = Object.keys(lineCounts).length;
    const busiestLine = Object.entries(lineCounts).sort((a, b) => b[1] - a[1])[0];
    const avgSpeed = speedCount > 0 ? (totalSpeed / speedCount) * 3.6 : 0; // Convert to km/h

    // Simulated late buses
    const lateCount = Math.floor(positions.length * 0.14); 
    const onTimeRate = 100 - (lateCount / positions.length * 100);
    const latePercentage = Math.round((lateCount / positions.length) * 100);

    return {
      activeBuses: positions.length,
      activeLines,
      coverage: totalRoutesCount > 0 ? (activeLines / totalRoutesCount) * 100 : 0,
      busiestLine: busiestLine ? { name: busiestLine[0], count: busiestLine[1] } : null,
      lateCount,
      latePercentage,
      avgDelay: 3, // Simulated average delay in minutes
      onTimeRate,
      avgSpeed,
      nightBuses
    };
  }, [positions, totalRoutesCount]);

  if (loading || !stats) return null;

  return (
    <div className="flex flex-col items-end gap-3">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.button
            key="collapsed"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setIsExpanded(true)}
            className="w-12 h-12 rounded-2xl bg-white/95 backdrop-blur-xl border border-neutral-200/50 shadow-lg flex items-center justify-center text-neutral-500 hover:text-brand-primary transition-colors cursor-pointer"
            aria-label="Expand statistics"
          >
            <BarChart3 size={20} strokeWidth={2.5} />
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            initial={{ y: -20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white/95 backdrop-blur-xl p-6 rounded-3xl border border-neutral-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.08)] min-w-[280px] flex flex-col gap-6 relative"
          >
            {/* Header with Live Status & Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Live Network</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-2 py-0.5 rounded-md bg-neutral-100 text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                  Porto, PT
                </div>
                <button 
                  onClick={() => setIsExpanded(false)}
                  className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 transition-colors cursor-pointer"
                  aria-label="Collapse statistics"
                >
                  <ChevronUp size={14} strokeWidth={3} />
                </button>
              </div>
            </div>

            {/* Stats Grid Layout */}
            <div className="flex flex-col gap-6">
              {/* Top Row: 3 Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-neutral-50/50 border border-neutral-100">
                  <Bus size={16} className="text-neutral-400" strokeWidth={2.5} />
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-black text-neutral-900 leading-none">{stats.activeBuses}</span>
                    <span className="text-[8px] font-black uppercase tracking-wider text-neutral-400 mt-1.5">Buses</span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-neutral-50/50 border border-neutral-100">
                  <MapPin size={16} className="text-neutral-400" strokeWidth={2.5} />
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-black text-neutral-900 leading-none">{stats.activeLines}</span>
                    <span className="text-[8px] font-black uppercase tracking-wider text-neutral-400 mt-1.5">Lines</span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-neutral-50/50 border border-neutral-100">
                  <Flame size={16} className="text-orange-500" strokeWidth={2.5} />
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-black text-orange-500 leading-none">{stats.busiestLine?.name}</span>
                    <span className="text-[8px] font-black uppercase tracking-wider text-neutral-400 mt-1.5">Busiest</span>
                  </div>
                </div>
              </div>

              {/* Bottom Row: 2 Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-green-50/50 border border-green-100/50">
                  <div className="p-2 rounded-xl bg-green-500/10 text-green-600">
                    <Clock size={18} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xl font-black text-green-600 leading-none">{Math.round(stats.onTimeRate)}%</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-green-600/60 mt-1.5">On-Time</span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-orange-50/50 border border-orange-100/50">
                  <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600">
                    <Activity size={18} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xl font-black text-orange-600 leading-none">{stats.avgDelay}m</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-orange-600/60 mt-1.5">Avg Delay</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Signature */}
            <div className="pt-4 border-t border-neutral-100 flex justify-center">
              <a 
                href="https://github.com/davidrocha9"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] font-black text-neutral-400/60 hover:text-brand-primary transition-all uppercase tracking-[0.2em] hover:tracking-[0.3em] cursor-pointer"
              >
                Made by David Rocha
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

