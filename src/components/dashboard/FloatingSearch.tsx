import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

interface FloatingSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onClear: () => void;
  isExpanded: boolean;
}

export const FloatingSearch = ({ searchTerm, onSearchChange, onClear, isExpanded }: FloatingSearchProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClear();
    }
  };

  return (
    <div className="fixed top-6 left-6 z-50 flex items-center gap-3 w-[400px] pointer-events-none">
      {/* Logo - Always Visible */}
      <div className="shrink-0 backdrop-blur-xl rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border flex items-center px-4 py-3 pointer-events-auto transition-all duration-300 bg-white/95 border-neutral-200">
        <div className="flex items-center gap-2">
          <img 
            src={logo} 
            alt="Linha Viva Porto Logo" 
            className="w-7 h-7 object-contain"
          />
          <div className="hidden sm:block">
            <h1 className="text-[13px] font-black leading-none tracking-tight">
              <span className="text-brand-primary">Linha</span>
              <span className="text-brand-secondary ml-0.5">Viva</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Search Bar - Animated Presence */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -10, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 pointer-events-auto min-w-0"
          >
            <div className="backdrop-blur-xl rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border flex items-center px-4 py-2 group transition-all duration-300 focus-within:ring-2 focus-within:ring-brand-primary/20 bg-white/95 border-neutral-200">
              <div className="relative flex-1 flex items-center">
                <Search 
                  className="absolute left-1 text-neutral-400 group-focus-within:text-brand-primary transition-colors" 
                  size={18} 
                  strokeWidth={2.5}
                />
                <input
                  type="text"
                  placeholder="Search lines..."
                  value={searchTerm}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-transparent border-none focus:ring-0 py-2 pl-8 pr-2 text-[14px] font-medium placeholder:text-neutral-400/70 text-neutral-900"
                />
                {searchTerm && (
                  <button
                    onClick={onClear}
                    className="p-1 text-neutral-400 transition-colors cursor-pointer hover:text-neutral-600"
                    aria-label="Clear search"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

