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
  currentPos: [number, number];
  previousPos: [number, number];
  nextPos: [number, number];
  startTime: number;
  endTime: number;
  bearing: number;
}

export interface SelectedBus {
  id: string;
  line: string;
  routeId: string | null;
}

