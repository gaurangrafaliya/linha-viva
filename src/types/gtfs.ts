export interface GTFSStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface GTFSRoute {
  id: string;
  shortName: string;
  longName: string;
  color?: string;
  textColor?: string;
  desc?: string;
  url?: string;
}

export interface GTFSTrip {
  routeId: string;
  tripId: string;
  headsign: string;
  directionId: number;
  shapeId: string;
}

export interface GTFSStopTime {
  tripId: string;
  arrivalTime: string;
  departureTime: string;
  stopId: string;
  stopSequence: number;
}

export interface GTFSShape {
  shapeId: string;
  lat: number;
  lng: number;
  sequence: number;
}

export interface GTFSData {
  stops: GTFSStop[];
  routes: GTFSRoute[];
  trips: GTFSTrip[];
}
