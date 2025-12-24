export interface FiwareProperty<T> {
  type: string;
  value: T;
  metadata?: Record<string, unknown>;
}

export interface FiwareGeoJsonPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface FiwareStructuredValue {
  cityName: string;
  district: string;
}

export interface FiwareVehicle {
  id: string;
  type: string;
  annotations: FiwareProperty<string[]>;
  bearing?: FiwareProperty<number>;
  category: FiwareProperty<string[]>;
  currentTripCount: FiwareProperty<number>;
  dataProvider: FiwareProperty<string>;
  feature: FiwareProperty<string[]>;
  fleetVehicleId: FiwareProperty<string>;
  heading?: FiwareProperty<number>;
  location: FiwareProperty<FiwareGeoJsonPoint>;
  municipalityInfo: FiwareProperty<FiwareStructuredValue>;
  name: FiwareProperty<string>;
  observationDateTime: FiwareProperty<string>;
  owner: FiwareProperty<string[]>;
  serviceProvided: FiwareProperty<string[]>;
  source: FiwareProperty<string>;
  speed: FiwareProperty<number>;
  vehicleType: FiwareProperty<string>;
}





