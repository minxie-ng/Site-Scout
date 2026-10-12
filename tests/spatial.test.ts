import { describe, expect, it } from "vitest";
import { clusterContainsBlock, evidenceAppliesToCluster, haversineDistanceMeters, isWithinRadiusMeters } from "../src/engine/spatial";

const namedMembers = [
  { blockId: "442A", roadName: "NEW PUNGGOL RD", latitude: 1.416, longitude: 103.907 },
  { blockId: "442B", roadName: "NEW PUNGGOL RD", latitude: 1.4162, longitude: 103.9073 },
  { blockId: "443A", roadName: "NEW PUNGGOL RD", latitude: 1.4164, longitude: 103.9076 },
];

describe("Gate 3 deterministic straight-line spatial calculations", () => {
  it("returns zero metres for the same coordinate", () => {
    const point = { latitude: 1.404, longitude: 103.905 };
    expect(haversineDistanceMeters(point, point)).toBe(0);
  });

  it("matches the known one-degree equatorial arc in metres in either direction", () => {
    const west = { latitude: 0, longitude: 0 };
    const east = { latitude: 0, longitude: 1 };
    expect(haversineDistanceMeters(west, east)).toBeCloseTo(111_194.927, 2);
    expect(haversineDistanceMeters(east, west)).toBeCloseTo(111_194.927, 2);
  });

  it("includes a point on the radius boundary and excludes a more distant point", () => {
    const origin = { latitude: 0, longitude: 0 };
    const east = { latitude: 0, longitude: 1 };
    expect(isWithinRadiusMeters(origin, east, 111_195)).toBe(true);
    expect(isWithinRadiusMeters(origin, east, 111_194)).toBe(false);
    expect(isWithinRadiusMeters(origin, origin, 0)).toBe(true);
  });

  it("rejects invalid coordinates and radius instead of producing a spatial claim", () => {
    const origin = { latitude: 1.4, longitude: 103.9 };
    expect(() => haversineDistanceMeters(origin, { latitude: 91, longitude: 0 })).toThrow(/latitude/i);
    expect(() => haversineDistanceMeters(origin, { latitude: 0, longitude: Number.NaN })).toThrow(/longitude/i);
    expect(() => isWithinRadiusMeters(origin, origin, -1)).toThrow(/radius/i);
    expect(() => isWithinRadiusMeters(origin, origin, Number.POSITIVE_INFINITY)).toThrow(/radius/i);
  });
});

describe("Gate 3 exact block-cluster membership", () => {
  it("matches a named block and street but not a different block or street", () => {
    expect(clusterContainsBlock(namedMembers, { blockId: "442A", roadName: "NEW PUNGGOL RD" })).toBe(true);
    expect(clusterContainsBlock(namedMembers, { blockId: "442A", roadName: "PUNGGOL WALK" })).toBe(false);
    expect(clusterContainsBlock(namedMembers, { blockId: "999A", roadName: "NEW PUNGGOL RD" })).toBe(false);
  });

  it("rejects duplicate block IDs instead of counting one block twice", () => {
    const duplicate = [namedMembers[0], { ...namedMembers[0], roadName: "PUNGGOL WALK" }];
    expect(() => clusterContainsBlock(duplicate, { blockId: "442A", roadName: "NEW PUNGGOL RD" })).toThrow(/duplicate/i);
  });

  it("rejects missing or invalid member coordinates", () => {
    expect(() => clusterContainsBlock([{ blockId: "442A", roadName: "NEW PUNGGOL RD", longitude: 103.907 }], { blockId: "442A", roadName: "NEW PUNGGOL RD" })).toThrow(/latitude/i);
    expect(() => clusterContainsBlock([{ ...namedMembers[0], longitude: Number.NaN }], { blockId: "442A", roadName: "NEW PUNGGOL RD" })).toThrow(/longitude/i);
  });

  it("keeps planning-area evidence contextual even when its name matches the cluster region", () => {
    expect(evidenceAppliesToCluster(namedMembers, { kind: "planning_area", name: "Punggol" })).toBe(false);
    expect(evidenceAppliesToCluster(namedMembers, { kind: "block", blockId: "442A", roadName: "NEW PUNGGOL RD" })).toBe(true);
    expect(evidenceAppliesToCluster(namedMembers, { kind: "block", blockId: "442A", roadName: "PUNGGOL WALK" })).toBe(false);
  });
});
