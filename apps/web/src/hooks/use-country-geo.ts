"use client";

import { useTopojsonGeo } from "./use-topojson-geo";

const WORLD_ATLAS_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";

export function useCountryGeo() {
  return useTopojsonGeo({
    queryKey: ["geo", "countries"],
    url: WORLD_ATLAS_URL,
    objectName: "countries",
  });
}
