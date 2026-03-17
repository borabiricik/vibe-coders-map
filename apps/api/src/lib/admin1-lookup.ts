import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import Flatbush from "flatbush";
import { latLngToCell } from "h3-js";
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from "geojson";
import admin1Topology from "../../../web/public/geo/admin1.json";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";

type Admin1Geometry = Polygon | MultiPolygon;

interface Admin1Properties {
  iso_3166_2?: string;
  iso_a2?: string;
}

interface IndexedRegion {
  feature: Feature<Admin1Geometry, Admin1Properties>;
  countryCode: string;
  regionCode: string;
}

export interface ResolvedRegion {
  countryCode: string;
  regionCode: string;
}

const REGION_CACHE_RESOLUTION = 8;
const MAX_REGION_CACHE_ENTRIES = 20_000;

const regionCache = new Map<string, ResolvedRegion | null>();

function splitIsoRegionCode(iso31662?: string): ResolvedRegion | null {
  if (!iso31662) return null;

  const [countryCode, ...regionParts] = iso31662.split("-");
  const regionCode = regionParts.join("-");

  if (!countryCode || !regionCode) {
    return null;
  }

  return { countryCode, regionCode };
}

function computeBounds(geometry: Admin1Geometry): [number, number, number, number] {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  return [minX, minY, maxX, maxY];
}

function cacheResolvedRegion(cell: string, resolved: ResolvedRegion | null) {
  if (regionCache.size >= MAX_REGION_CACHE_ENTRIES) {
    const oldestKey = regionCache.keys().next().value;
    if (oldestKey) {
      regionCache.delete(oldestKey);
    }
  }

  regionCache.set(cell, resolved);
}

const admin1FeatureCollection = feature(
  admin1Topology as unknown as Topology,
  (admin1Topology as unknown as Topology).objects.admin1 as GeometryCollection,
) as FeatureCollection<Admin1Geometry, Admin1Properties>;

const indexedRegions: IndexedRegion[] = [];

for (const admin1Feature of admin1FeatureCollection.features) {
  if (!admin1Feature.geometry) continue;

  const parsedCode = splitIsoRegionCode(admin1Feature.properties?.iso_3166_2);
  const countryCode = admin1Feature.properties?.iso_a2 ?? parsedCode?.countryCode ?? null;

  if (!parsedCode || !countryCode) continue;

  indexedRegions.push({
    feature: admin1Feature,
    countryCode,
    regionCode: parsedCode.regionCode,
  });
}

const admin1Index = new Flatbush(indexedRegions.length);

for (const indexedRegion of indexedRegions) {
  const [minX, minY, maxX, maxY] = computeBounds(indexedRegion.feature.geometry);
  admin1Index.add(minX, minY, maxX, maxY);
}

admin1Index.finish();

export function resolveRegionFromCoordinates(lat: number, lng: number): ResolvedRegion | null {
  const cell = latLngToCell(lat, lng, REGION_CACHE_RESOLUTION);
  if (regionCache.has(cell)) {
    return regionCache.get(cell) ?? null;
  }

  const point = [lng, lat] as Position;
  const candidateIndexes = admin1Index.search(lng, lat, lng, lat);

  for (const index of candidateIndexes) {
    const candidate = indexedRegions[index];
    if (!candidate) continue;

    if (booleanPointInPolygon(point, candidate.feature)) {
      const resolved = {
        countryCode: candidate.countryCode,
        regionCode: candidate.regionCode,
      };
      cacheResolvedRegion(cell, resolved);
      return resolved;
    }
  }

  cacheResolvedRegion(cell, null);
  return null;
}
