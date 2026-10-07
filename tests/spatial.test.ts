import { describe, expect, it } from "vitest";
import { haversineDistanceMeters, isWithinRadiusMeters } from "../src/engine/spatial";

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
