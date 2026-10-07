type Coordinate = { latitude: number; longitude: number };
type BlockIdentity = { blockId: string; roadName: string };
type BlockMember = BlockIdentity & Partial<Coordinate>;
type EvidenceGeography = ({ kind: "block" } & BlockIdentity) | { kind: "planning_area"; name: string };

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

function validateMembers(members: readonly BlockMember[]): void {
  if (members.length === 0) throw new RangeError("Cluster must contain at least one block");
  const blockIds = new Set<string>();
  for (const member of members) {
    if (!member.blockId?.trim() || !member.roadName?.trim()) throw new RangeError("Block ID and road name are required");
    if (blockIds.has(member.blockId)) throw new RangeError("Duplicate block ID in cluster");
    blockIds.add(member.blockId);
    if (typeof member.latitude !== "number" || !Number.isFinite(member.latitude) || member.latitude < 1.1 || member.latitude > 1.5) {
      throw new RangeError("Member latitude must be a valid Singapore coordinate");
    }
    if (typeof member.longitude !== "number" || !Number.isFinite(member.longitude) || member.longitude < 103.6 || member.longitude > 104.1) {
      throw new RangeError("Member longitude must be a valid Singapore coordinate");
    }
  }
}

/** Exact published block identity; this does not create a walking or market catchment. */
export function clusterContainsBlock(members: readonly BlockMember[], target: BlockIdentity): boolean {
  validateMembers(members);
  return members.some(member => member.blockId === target.blockId && member.roadName === target.roadName);
}

/** Broad-area evidence remains context and cannot become a block-cluster claim. */
export function evidenceAppliesToCluster(members: readonly BlockMember[], geography: EvidenceGeography): boolean {
  validateMembers(members);
  return geography.kind === "block" && clusterContainsBlock(members, geography);
}
