"use client";

import { useMapStore } from "@/hooks/use-map-viewport";
import { useTopojsonGeo } from "./use-topojson-geo";

const ADMIN1_TOPOJSON_URL = "/geo/admin1.json";

export const ADMIN1_PREFETCH_ZOOM = 3.5;
export const ADMIN1_VISIBLE_ZOOM = 4;

export function useAdmin1Geo() {
  const zoom = useMapStore((state) => state.zoom);

  return useTopojsonGeo({
    queryKey: ["geo", "admin1"],
    url: ADMIN1_TOPOJSON_URL,
    objectName: "admin1",
    enabled: zoom >= ADMIN1_PREFETCH_ZOOM,
  });
}
