import { describe, expect, it } from "vitest";
import { resolveRegionFromCoordinates } from "../src/lib/admin1-lookup";
import SEED_LOCATIONS from "./seed-locations.json";

describe("admin1 lookup", () => {
  it("covers at least 50 seeded cities", () => {
    expect(SEED_LOCATIONS.length).toBeGreaterThanOrEqual(50);
  });

  it("resolves the expected country and region for the seeded global cities", () => {
    for (const location of SEED_LOCATIONS) {
      const resolved = resolveRegionFromCoordinates(location.lat, location.lng);

      if (!location.region_code) {
        expect(resolved, `Expected no admin1 region for ${location.city}`).toBeNull();
        continue;
      }

      expect(
        resolved,
        `Expected a region match for ${location.city} (${location.country}-${location.region_code})`,
      ).not.toBeNull();

      expect(resolved?.countryCode, `Country mismatch for ${location.city}`).toBe(location.country);
      expect(resolved?.regionCode, `Region mismatch for ${location.city}`).toBe(location.region_code);
    }
  });
});
