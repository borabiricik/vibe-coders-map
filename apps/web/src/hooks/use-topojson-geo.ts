"use client";

import { useQuery } from "@tanstack/react-query";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import type {
  GeometryCollection,
  Topology,
} from "topojson-specification";

interface UseTopojsonGeoOptions {
  queryKey: readonly unknown[];
  url: string;
  objectName: string;
  enabled?: boolean;
}

function topologyToFeatureCollection(
  topology: Topology,
  objectName: string,
): FeatureCollection<Geometry> {
  const topologyObject = topology.objects[objectName];

  if (!topologyObject) {
    throw new Error(`Topology object "${objectName}" not found.`);
  }

  return feature(
    topology,
    topologyObject as GeometryCollection,
  ) as FeatureCollection<Geometry>;
}

export function useTopojsonGeo({
  queryKey,
  url,
  objectName,
  enabled = true,
}: UseTopojsonGeoOptions) {
  const { data } = useQuery({
    queryKey: [...queryKey, url, objectName],
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async ({ signal }) => {
      const response = await fetch(url, {
        signal,
        cache: "force-cache",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${objectName} topology: ${response.status}`);
      }

      return topologyToFeatureCollection(
        (await response.json()) as Topology,
        objectName,
      );
    },
  });

  return enabled ? data ?? null : null;
}
