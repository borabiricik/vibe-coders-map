"use client";

import { useQuery } from "@tanstack/react-query";
import type { FeatureCollection, Geometry } from "geojson";

const COUNTRIES_GEOJSON_URL = "/geo/countries.geojson";

export function useCountryGeo() {
  const { data } = useQuery({
    queryKey: ["geo", "countries", COUNTRIES_GEOJSON_URL],
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async ({ signal }) => {
      const response = await fetch(COUNTRIES_GEOJSON_URL, {
        signal,
        cache: "force-cache",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch countries GeoJSON: ${response.status}`);
      }

      return (await response.json()) as FeatureCollection<Geometry>;
    },
  });

  return data ?? null;
}
