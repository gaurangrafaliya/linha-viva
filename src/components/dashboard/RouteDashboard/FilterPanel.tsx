import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/context/AppContext";
import { useDashboardContext } from "@/context/DashboardContext";
import { GTFSRoute } from "@/types/gtfs";
import { compareRoutes } from "@/hooks/dashboard/useRouteFiltering";

const LINE_GROUPS = ["200", "300", "400", "500", "600", "700", "800", "900", "Night", "Zonal"];

interface FilterPanelProps {
  routes: GTFSRoute[];
}

export const FilterPanel = ({ routes }: FilterPanelProps) => {
  const { 
    activeGroup, 
    setActiveGroup, 
    selectedLines, 
    setSelectedLines 
  } = useAppContext();
  
  const { isFilterPanelOpen } = useDashboardContext();

  const handleToggleGroup = (group: string) => {
    setActiveGroup(prev => prev === group ? null : group);
  };

  const handleToggleLineFilter = (shortName: string) => {
    setSelectedLines(prev => 
      prev.includes(shortName) 
        ? prev.filter(s => s !== shortName) 
        : [...prev, shortName]
    );
  };

  return (
    <AnimatePresence>
      {isFilterPanelOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden mt-4"
        >
          <div className="flex flex-col gap-4 pb-2">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 px-1">Browse Groups</span>
              <div className="flex flex-wrap gap-1.5">
                {LINE_GROUPS.map(group => (
                  <button
                    key={group}
                    onClick={() => handleToggleGroup(group)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all cursor-pointer",
                      activeGroup === group
                        ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                        : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                    )}
                  >
                    {group}{!isNaN(parseInt(group)) ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {activeGroup && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col gap-2 p-3 bg-neutral-50 rounded-xl border border-neutral-100"
                >
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-primary">
                      Select from {activeGroup}{!isNaN(parseInt(activeGroup)) ? 's' : ''}
                    </span>
                    <button 
                      onClick={() => {
                        const groupLines = routes.filter(r => {
                          if (activeGroup === 'Night') return r.shortName.endsWith('M');
                          if (activeGroup === 'Zonal') return r.shortName.startsWith('Z');
                          const num = parseInt(r.shortName);
                          const groupNum = parseInt(activeGroup);
                          return !isNaN(num) && num >= groupNum && num < groupNum + 100;
                        }).map(r => r.shortName);
                        
                        setSelectedLines(prev => {
                          const allSelected = groupLines.every(l => prev.includes(l));
                          if (allSelected) {
                            return prev.filter(l => !groupLines.includes(l));
                          }
                          return Array.from(new Set([...prev, ...groupLines]));
                        });
                      }}
                      className="text-[9px] font-black uppercase tracking-widest text-neutral-400 hover:text-brand-primary transition-colors cursor-pointer"
                    >
                      Toggle All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto custom-scrollbar p-1">
                    {routes
                      .filter(r => {
                        if (activeGroup === 'Night') return r.shortName.endsWith('M');
                        if (activeGroup === 'Zonal') return r.shortName.startsWith('Z');
                        const num = parseInt(r.shortName);
                        const groupNum = parseInt(activeGroup);
                        return !isNaN(num) && num >= groupNum && num < groupNum + 100;
                      })
                      .sort(compareRoutes)
                      .map(route => (
                        <button
                          key={route.id}
                          onClick={() => handleToggleLineFilter(route.shortName)}
                          className={cn(
                            "px-2 py-1 rounded-md text-[9px] font-black transition-all border cursor-pointer",
                            selectedLines.includes(route.shortName)
                              ? "bg-brand-primary border-brand-primary text-white"
                              : "bg-white border-neutral-200 text-neutral-500 hover:border-brand-primary/30"
                          )}
                        >
                          {route.shortName}
                        </button>
                      ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {selectedLines.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500">Your Selection</span>
                  <button 
                    onClick={() => setSelectedLines([])}
                    className="text-[9px] font-black uppercase tracking-widest text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedLines.map(line => (
                    <button
                      key={line}
                      onClick={() => handleToggleLineFilter(line)}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight bg-brand-primary text-white shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      {line}
                      <Check size={10} strokeWidth={4} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedLines.length > 0 && (
              <button
                onClick={() => {
                  setActiveGroup(null);
                  setSelectedLines([]);
                }}
                className="text-[10px] font-black uppercase tracking-widest text-brand-primary mt-2 text-center w-full py-2 bg-brand-primary/5 rounded-lg hover:bg-brand-primary/10 transition-colors cursor-pointer"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

