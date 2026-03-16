"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchStats } from "@/lib/api";
import { getToolBranding } from "@vibe/shared-types";
import { ToolLogoBadge } from "./tool-logo-badge";

export function GlobalStats() {
  const { data, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });

  if (isLoading || !data) {
    return (
      <div className="animate-pulse rounded-xl border border-gray-700/50 bg-gray-900/80 p-4 backdrop-blur-lg">
        <div className="mb-2 h-4 w-32 rounded bg-gray-700" />
        <div className="mb-3 h-8 w-20 rounded bg-gray-700" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-gray-700" />
          <div className="h-3 w-3/4 rounded bg-gray-700" />
          <div className="h-3 w-1/2 rounded bg-gray-700" />
        </div>
      </div>
    );
  }

  const topTools = Object.entries(data.by_tool)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
    .slice(0, 5);

  const minutesAgo = data.last_updated
    ? Math.round((Date.now() - new Date(data.last_updated).getTime()) / 60000)
    : null;

  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-900/80 p-4 backdrop-blur-lg min-w-[220px]">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
        Active Vibe Coders
      </p>
      <p className="mt-1 text-3xl font-bold tabular-nums">
        {data.total_active.toLocaleString()}
      </p>

      {topTools.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {topTools.map(([tool, count]) => {
            const { label, color } = getToolBranding(tool);

            return (
              <div key={tool} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <ToolLogoBadge tool={tool} size="md" />
                  <span className="text-gray-300" style={{ color }}>
                    {label}
                  </span>
                </div>
                <span className="font-medium tabular-nums text-gray-400">
                  {(count ?? 0).toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {minutesAgo != null && (
        <p className="mt-3 text-[10px] text-gray-500">
          Updated {minutesAgo < 1 ? "just now" : `${minutesAgo}m ago`}
        </p>
      )}
    </div>
  );
}
