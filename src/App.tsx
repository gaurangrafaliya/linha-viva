import { useState, useEffect } from "react";
import { MapContainer } from "@/components/map/MapContainer";
import { MapSettings } from "@/components/map/MapSettings";
import { RouteDashboard } from "@/components/dashboard/RouteDashboard";
import { FloatingSearch } from "@/components/dashboard/FloatingSearch";
import { MAP_STYLES, MapStyleId } from "@/constants/mapStyles";
import { cn } from "@/lib/utils";

const App = () => {
  const [currentStyleId, setCurrentStyleId] = useState<MapStyleId>('VOYAGER');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDashboardExpanded, setIsDashboardExpanded] = useState(true);
  
  const currentStyle = MAP_STYLES[currentStyleId];

  // Sync theme with the HTML element for global Tailwind support
  useEffect(() => {
    if (currentStyle.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [currentStyle.theme]);

  const handleStyleChange = (styleId: MapStyleId) => {
    setCurrentStyleId(styleId);
  };

  const handleRouteSelect = (routeId: string | null) => {
    setSelectedRouteId(routeId);
    if (routeId) setIsDashboardExpanded(true);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setSelectedRouteId(null);
  };

  return (
    <main 
      className={cn(
        "relative w-full h-screen overflow-hidden transition-colors duration-500",
        currentStyle.theme === 'dark' ? "bg-neutral-950" : "bg-white"
      )}
      aria-label="Porto Bus Live Visualization Map"
    >
      <MapContainer 
        styleUrl={currentStyle.url} 
        onSelectRoute={handleRouteSelect}
        selectedRouteId={selectedRouteId}
        theme={currentStyle.theme}
      />
      
      <FloatingSearch 
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onClear={handleClearSearch}
        theme={currentStyle.theme}
        isExpanded={isDashboardExpanded}
      />

      <div 
        className="absolute top-6 right-6 z-40 pointer-events-none"
        role="complementary"
        aria-label="Map Controls"
      >
        <MapSettings 
          currentStyleId={currentStyle.id} 
          onStyleChange={handleStyleChange} 
          theme={currentStyle.theme}
        />
      </div>

      <RouteDashboard 
        selectedRouteId={selectedRouteId}
        onRouteSelect={handleRouteSelect}
        searchTerm={searchTerm}
        theme={currentStyle.theme}
        isExpanded={isDashboardExpanded}
        onToggleExpand={() => setIsDashboardExpanded(!isDashboardExpanded)}
      />
    </main>
  );
};

export default App;

