import { useState } from "react";
import { MapContainer } from "@/components/map/MapContainer";
import { MapSettings } from "@/components/map/MapSettings";
import { MAP_STYLES, MapStyleId } from "@/constants/mapStyles";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

const App = () => {
  const [currentStyleId, setCurrentStyleId] = useState<MapStyleId>('VOYAGER');
  const currentStyle = MAP_STYLES[currentStyleId];

  const handleStyleChange = (styleId: MapStyleId) => {
    setCurrentStyleId(styleId);
  };

  return (
    <main 
      className={cn(
        "relative w-full h-screen overflow-hidden transition-colors duration-500",
        currentStyle.theme === 'dark' ? "dark bg-neutral-950" : "bg-white"
      )}
      aria-label="Porto Bus Live Visualization Map"
    >
      <MapContainer styleUrl={currentStyle.url} />
      
      <div 
        className="absolute top-4 left-4 right-4 z-10 pointer-events-none flex justify-between items-start"
        role="complementary"
        aria-label="Map Controls and Info"
      >
        <div className="pointer-events-auto flex items-center gap-3 p-2">
          <img 
            src={logo} 
            alt="Linha Viva Porto Logo" 
            className="w-12 h-12 object-contain drop-shadow-md"
          />
          <div className="drop-shadow-sm ">
            <h1 className="text-2xl font-black leading-none tracking-tight transition-colors duration-300">
              <span className="text-brand-primary dark:text-brand-primary">Linha</span>
              <span className="text-brand-secondary ml-1.5">Viva</span>
            </h1>
          </div>
        </div>

        <MapSettings 
          currentStyleId={currentStyle.id} 
          onStyleChange={handleStyleChange} 
          theme={currentStyle.theme}
        />
      </div>
    </main>
  );
};

export default App;

