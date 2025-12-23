import { BusPosition } from "@/types/bus";
import { FiwareVehicle } from "@/types/fiware";

const FIWARE_API_URL = "https://broker.fiware.urbanplatform.portodigital.pt/v2/entities?q=vehicleType==bus&limit=1000";

const extractRouteNumber = (annotations: string[]): string => {
  const routeAnnotation = annotations.find(ann => ann.startsWith("stcp:route:"));
  if (!routeAnnotation) return "";
  return routeAnnotation.replace("stcp:route:", "");
};

const transformFiwareVehicleToBusPosition = (vehicle: FiwareVehicle): BusPosition => {
  const routeNumber = extractRouteNumber(vehicle.annotations.value);
  const coordinates = vehicle.location.value.coordinates;
  const bearing = vehicle.bearing?.value ?? vehicle.heading?.value;
  
  return {
    id: vehicle.fleetVehicleId.value,
    line: routeNumber,
    operator: vehicle.dataProvider.value,
    latitude: coordinates[1],
    longitude: coordinates[0],
    bearing: bearing,
    speed: vehicle.speed.value,
    timestamp: vehicle.observationDateTime.value,
  };
};

export const busService = {
  fetchLivePositions: async (): Promise<BusPosition[]> => {
    try {
      const response = await fetch(FIWARE_API_URL);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch bus positions: ${response.status} ${response.statusText}`);
      }
      
      const vehicles: FiwareVehicle[] = await response.json();
      
      return vehicles
        .map(transformFiwareVehicleToBusPosition)
        .filter(bus => bus.line !== "");
    } catch (error) {
      console.error("Error fetching bus positions:", error);
      return [];
    }
  }
};

