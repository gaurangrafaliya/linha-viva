import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/context/AppContext";

export const DashboardToggle = () => {
  const { isDashboardExpanded, handleToggleExpand } = useAppContext();

  return (
    <button
      onClick={handleToggleExpand}
      className={cn(
        "absolute top-1/2 -translate-y-1/2 w-8 h-12 border shadow-xl pointer-events-auto flex items-center justify-center text-neutral-400 hover:text-brand-primary transition-all group z-40 focus:outline-none rounded-xl cursor-pointer bg-white border-neutral-200",
        isDashboardExpanded ? "-right-4" : "-left-1"
      )}
      aria-label={isDashboardExpanded ? "Collapse dashboard" : "Expand dashboard"}
    >
      {isDashboardExpanded ? <ChevronLeft size={20} strokeWidth={3} /> : <ChevronRight size={20} strokeWidth={3} />}
    </button>
  );
};

