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
}

export interface GTFSData {
  stops: GTFSStop[];
  routes: GTFSRoute[];
  // Add more as needed: trips, shapes, etc.
}

