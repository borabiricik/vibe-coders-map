"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { KNOWN_TOOLS, getToolBranding } from "@vibe/shared-types";
import { useMapStore } from "@/hooks/use-map-viewport";
import { fetchStats } from "@/lib/api";
import { ToolLogoBadge } from "./tool-logo-badge";

export function ToolFilter() {
  const activeFilters = useMapStore((s) => s.activeFilters);
  const toggleFilter = useMapStore((s) => s.toggleFilter);
  const clearFilters = useMapStore((s) => s.clearFilters);

  const { data } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });

  // Sort tools by usage count (highest first)
  const sortedTools = useMemo(() => {
    if (!data?.by_tool) return [...KNOWN_TOOLS];
    return [...KNOWN_TOOLS].sort((a, b) => {
      const countA = data.by_tool[a] ?? 0;
      const countB = data.by_tool[b] ?? 0;
      return countB - countA;
    });
  }, [data?.by_tool]);

  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-900/80 p-3 backdrop-blur-lg">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
          Filter by Tool
        </p>
        {activeFilters.length > 0 && (
          <button
            onClick={clearFilters}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sortedTools.map((tool) => {
          const isActive = activeFilters.includes(tool);
          const { color, label } = getToolBranding(tool);
          return (
            <button
              key={tool}
              onClick={() => toggleFilter(tool)}
              className="flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium transition-all"
              style={{
                backgroundColor: isActive ? `${color}22` : "transparent",
                borderWidth: 1,
                borderColor: isActive ? `${color}66` : "rgba(75,85,99,0.5)",
                color: isActive ? color : "#9CA3AF",
              }}
            >
              <ToolLogoBadge tool={tool} size="sm" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
