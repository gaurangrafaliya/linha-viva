import { BusPosition } from "@/types/bus";

const API_URL = 'https://opendata.porto.digital/api/3/action/datastore_search?resource_id=072a27b1-e73a-4416-8d69-a1b70d540306';

export const busService = {
  fetchLivePositions: async (): Promise<BusPosition[]> => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch bus positions: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.result?.records) {
        return data.result.records.map((record: Record<string, any>) => ({
          id: record.vehicle_id || record.id,
          line: record.line_id || record.route_id,
          operator: 'STCP',
          latitude: parseFloat(record.lat || record.latitude),
          longitude: parseFloat(record.lon || record.longitude),
          bearing: parseFloat(record.bearing || 0),
          speed: parseFloat(record.speed || 0),
          timestamp: record.timestamp || new Date().toISOString()
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error in busService.fetchLivePositions:', error);
      return [];
    }
  }
};

