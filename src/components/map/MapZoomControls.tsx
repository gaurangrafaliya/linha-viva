import { memo, MutableRefObject } from 'react';
import maplibregl from 'maplibre-gl';

interface MapZoomControlsProps {
  mapRef: MutableRefObject<maplibregl.Map | null>;
}

export const MapZoomControls = memo(({ mapRef }: MapZoomControlsProps) => {
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

  return (
    <div className="absolute right-6 bottom-6 flex flex-col gap-2 z-20">
      <button 
        onClick={handleZoomIn}
        aria-label="Zoom in"
        className="w-10 h-10 bg-white/95 backdrop-blur-xl border border-neutral-200/50 rounded-xl shadow-lg flex items-center justify-center text-neutral-600 hover:text-brand-primary transition-colors cursor-pointer"
      >
        <span className="text-xl font-bold">+</span>
      </button>
      <button 
        onClick={handleZoomOut}
        aria-label="Zoom out"
        className="w-10 h-10 bg-white/95 backdrop-blur-xl border border-neutral-200/50 rounded-xl shadow-lg flex items-center justify-center text-neutral-600 hover:text-brand-primary transition-colors cursor-pointer"
      >
        <span className="text-xl font-bold">−</span>
      </button>
    </div>
  );
});

MapZoomControls.displayName = 'MapZoomControls';

