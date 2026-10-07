type Coordinate = { latitude: number; longitude: number };

const EARTH_RADIUS_METERS = 6_371_000;

function validateCoordinate(point: Coordinate): void {
  if (!Number.isFinite(point.latitude) || point.latitude < -90 || point.latitude > 90) {
    throw new RangeError("Latitude must be finite and within -90 to 90 degrees");
  }
  if (!Number.isFinite(point.longitude) || point.longitude < -180 || point.longitude > 180) {
    throw new RangeError("Longitude must be finite and within -180 to 180 degrees");
  }
}

/** Surface great-circle distance; it is not walking or transit distance. */
export function haversineDistanceMeters(origin: Coordinate, destination: Coordinate): number {
  validateCoordinate(origin);
  validateCoordinate(destination);
  const radians = Math.PI / 180;
  const latitudeDifference = (destination.latitude - origin.latitude) * radians;
  const longitudeDifference = (destination.longitude - origin.longitude) * radians;
  const arc = Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(origin.latitude * radians) * Math.cos(destination.latitude * radians) *
    Math.sin(longitudeDifference / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(Math.min(1, Math.max(0, arc))));
}

export function isWithinRadiusMeters(origin: Coordinate, destination: Coordinate, radiusMeters: number): boolean {
  if (!Number.isFinite(radiusMeters) || radiusMeters < 0) {
    throw new RangeError("Radius in metres must be nonnegative and finite");
  }
  return haversineDistanceMeters(origin, destination) <= radiusMeters;
}
