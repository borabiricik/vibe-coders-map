"use client";

import { useQuery } from "@tanstack/react-query";
import { getToolBranding } from "@vibe/shared-types";
import { fetchChoropleth } from "@/lib/api";
import { ToolLogoBadge } from "@/components/stats/tool-logo-badge";

interface RegionPopupProps {
  type: "country" | "region";
  code: string;
  name: string;
  onClose: () => void;
}

export function RegionPopup({ type, code, name, onClose }: RegionPopupProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["choropleth"],
    queryFn: fetchChoropleth,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });

  const regionData =
    type === "country" ? data?.countries?.[code] : data?.regions?.[code];

  return (
    <div className="min-w-[180px] rounded-xl border border-gray-700/50 bg-gray-900/95 p-3 shadow-xl backdrop-blur-lg">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">{name}</p>
        <button
          onClick={onClose}
          className="ml-2 text-gray-400 transition-colors hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-20 rounded bg-gray-700" />
          <div className="h-8 w-16 rounded bg-gray-700" />
        </div>
      ) : !regionData ? (
        <p className="text-xs text-gray-500">No active coders</p>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-gray-400">
              Active Coders
            </span>
            <span className="text-xl font-bold tabular-nums text-white">
              {regionData.count.toLocaleString()}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-800/50 p-2">
            <ToolLogoBadge tool={regionData.dominantTool} size="md" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-gray-500">
                Top Tool
              </span>
              <span
                className="text-sm font-medium"
                style={{ color: getToolBranding(regionData.dominantTool).color }}
              >
                {getToolBranding(regionData.dominantTool).label}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
