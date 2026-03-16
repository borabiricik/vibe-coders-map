"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TOOL_COLORS } from "@vibe/shared-types";
import type { ToolId, RegionData } from "@vibe/shared-types";
import { fetchChoropleth } from "@/lib/api";
import { useMapStore } from "@/hooks/use-map-viewport";

const COUNTRY_CODE_EXPRESSION: unknown[] = [
  "coalesce",
  ["get", "ISO_A2_EH"],
  ["get", "ISO_A2"],
];

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function opacityFromCount(count: number): number {
  return Math.min(0.6, 0.15 + Math.log10(count + 1) * 0.15);
}

function filterByActiveTools(
  data: Record<string, RegionData>,
  activeFilters: ToolId[],
): Record<string, RegionData> {
  if (activeFilters.length === 0) return data;
  const filtered: Record<string, RegionData> = {};
  for (const [key, rd] of Object.entries(data)) {
    if (activeFilters.includes(rd.dominantTool)) {
      filtered[key] = rd;
    }
  }
  return filtered;
}

export function useChoropleth() {
  const activeFilters = useMapStore((s) => s.activeFilters);

  const { data } = useQuery({
    queryKey: ["choropleth"],
    queryFn: fetchChoropleth,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });

  const countries = useMemo(
    () => filterByActiveTools(data?.countries ?? {}, activeFilters),
    [data?.countries, activeFilters],
  );

  const regions = useMemo(
    () => filterByActiveTools(data?.regions ?? {}, activeFilters),
    [data?.regions, activeFilters],
  );

  const countryFillColor = useMemo((): unknown => {
    const entries = Object.entries(countries);
    if (entries.length === 0) return "transparent";
    const expr: unknown[] = ["match", COUNTRY_CODE_EXPRESSION];
    for (const [alpha2, rd] of entries) {
      const color = TOOL_COLORS[rd.dominantTool];
      expr.push(alpha2, hexToRgba(color, opacityFromCount(rd.count)));
    }
    expr.push("transparent");
    return expr;
  }, [countries]);

  const admin1FillColor = useMemo((): unknown => {
    const entries = Object.entries(regions);
    if (entries.length === 0) return "transparent";
    const expr: unknown[] = ["match", ["get", "iso_3166_2"]];
    for (const [regionCode, rd] of entries) {
      const color = TOOL_COLORS[rd.dominantTool];
      expr.push(regionCode, hexToRgba(color, opacityFromCount(rd.count)));
    }
    expr.push("transparent");
    return expr;
  }, [regions]);

  const countryLineColor = useMemo((): unknown => {
    const entries = Object.entries(countries);
    if (entries.length === 0) return "transparent";
    const expr: unknown[] = ["match", COUNTRY_CODE_EXPRESSION];
    for (const [alpha2, rd] of entries) {
      expr.push(alpha2, TOOL_COLORS[rd.dominantTool]);
    }
    expr.push("transparent");
    return expr;
  }, [countries]);

  const admin1LineColor = useMemo((): unknown => {
    const entries = Object.entries(regions);
    if (entries.length === 0) return "transparent";
    const expr: unknown[] = ["match", ["get", "iso_3166_2"]];
    for (const [regionCode, rd] of entries) {
      expr.push(regionCode, TOOL_COLORS[rd.dominantTool]);
    }
    expr.push("transparent");
    return expr;
  }, [regions]);

  return {
    countryFillColor,
    countryLineColor,
    admin1FillColor,
    admin1LineColor,
  };
}
