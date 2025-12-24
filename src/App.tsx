import { MapContainer } from "@/components/map/MapContainer";
import { RouteDashboard } from "@/components/dashboard/RouteDashboard";
import { FloatingSearch } from "@/components/dashboard/FloatingSearch";
import { NetworkStats } from "@/components/dashboard/NetworkStats";
import { AppProvider } from "@/context/AppContext";

const AppContent = () => {
  return (
    <main 
      className="relative w-full h-screen overflow-hidden transition-colors duration-500 bg-white"
      aria-label="Porto Bus Live Visualization Map"
    >
      <NetworkStats />
      <MapContainer />
      <FloatingSearch />
      <RouteDashboard />
    </main>
  );
};

const App = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
