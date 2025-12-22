export interface BusPosition {
  id: string;
  line: string;
  operator: string;
  latitude: number;
  longitude: number;
  bearing?: number;
  speed?: number;
  timestamp: string;
}

export interface InterpolatedBus {
  id: string;
  line: string;
  currentPos: [number, number]; // [lng, lat]
  previousPos: [number, number]; // [lng, lat]
  nextPos: [number, number]; // [lng, lat]
  startTime: number;
  endTime: number;
  bearing: number;
}

