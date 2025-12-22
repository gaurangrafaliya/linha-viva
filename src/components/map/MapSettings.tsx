import { Settings, Map as MapIcon, Check } from 'lucide-react';
import { useState } from 'react';
import { MAP_STYLES, MapStyleId, Theme } from '@/constants/mapStyles';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface MapSettingsProps {
  currentStyleId: string;
  onStyleChange: (styleId: MapStyleId) => void;
  theme: Theme;
}

export const MapSettings = ({ currentStyleId, onStyleChange, theme }: MapSettingsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isDark = theme === 'dark';

  const handleToggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  const handleStyleSelect = (id: MapStyleId) => {
    onStyleChange(id);
    setIsOpen(false);
  };

  return (
    <div className="relative pointer-events-auto">
      <button
        type="button"
        onClick={handleToggleOpen}
        className={cn(
          "p-2.5 rounded-full shadow-lg border transition-all hover:scale-105 active:scale-95",
          isDark 
            ? "bg-neutral-900 border-neutral-800 ring-offset-neutral-950" 
            : "bg-white border-neutral-200 ring-offset-white",
          isOpen && "ring-2 ring-brand-primary ring-offset-2"
        )}
        aria-label="Map Settings"
        aria-expanded={isOpen}
      >
        <Settings className={cn(
          "w-5 h-5 transition-transform duration-500 ease-in-out",
          isOpen ? "rotate-180 text-brand-secondary" : "text-brand-primary"
        )} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "absolute right-0 top-14 w-72 rounded-2xl shadow-2xl border overflow-hidden z-50 origin-top-right",
              isDark ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"
            )}
            role="menu"
          >
            <div className={cn(
              "p-4 border-b",
              isDark ? "border-neutral-800 bg-neutral-800/50" : "border-neutral-100 bg-neutral-50/50"
            )}>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <MapIcon className={cn("w-4 h-4", isDark ? "text-brand-secondary" : "text-brand-primary")} />
                <span className={isDark ? "text-brand-secondary" : "text-brand-primary"}>Map Appearance</span>
              </h3>
            </div>
            
            <div className="p-2 space-y-1">
              {(Object.keys(MAP_STYLES) as MapStyleId[]).map((key) => {
                const style = MAP_STYLES[key];
                const isSelected = style.id === currentStyleId;
                
                return (
                  <button
                    key={style.id}
                    onClick={() => handleStyleSelect(key)}
                    className={cn(
                      "group w-full flex flex-col gap-2 p-2 rounded-xl transition-all duration-200 text-left",
                      isSelected 
                        ? (isDark ? "bg-brand-secondary/10 ring-1 ring-brand-secondary/30" : "bg-brand-primary/5 ring-1 ring-brand-primary/20")
                        : (isDark ? "hover:bg-neutral-800" : "hover:bg-neutral-50")
                    )}
                    role="menuitem"
                  >
                    <div className={cn(
                      "relative w-full h-24 rounded-lg overflow-hidden border transition-colors",
                      isDark ? "border-brand-secondary/20 bg-neutral-800" : "border-neutral-200 bg-neutral-100"
                    )}>
                      <img 
                        src={style.previewUrl} 
                        alt={style.label}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />

                      {isSelected && (
                        <div className="absolute inset-0 bg-brand-primary/10 flex items-center justify-center">
                          <div className="bg-brand-secondary text-white p-1 rounded-full shadow-lg">
                            <Check className="w-4 h-4" />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between px-1">
                      <span className={cn(
                        "text-sm font-bold transition-colors",
                        isDark ? "text-brand-secondary" : "text-brand-primary",
                        !isSelected && "opacity-70 group-hover:opacity-100"
                      )}>
                        {style.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
