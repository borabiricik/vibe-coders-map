"use client";

import { useMemo } from "react";
import { Button, Card, CardBody, CardHeader, ScrollShadow } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { KNOWN_TOOLS, getToolBranding } from "@vibe/shared-types";
import { useMapStore } from "@/hooks/use-map-viewport";
import { fetchStats } from "@/lib/api";
import { withAlpha } from "@/lib/color";
import { SlidersHorizontalIcon } from "@/components/ui/sliders-horizontal";
import { ToolLogoBadge } from "./tool-logo-badge";

export function ToolFilter() {
  const activeFilters = useMapStore((s) => s.activeFilters);
  const toggleFilter = useMapStore((s) => s.toggleFilter);
  const clearFilters = useMapStore((s) => s.clearFilters);
  const isAllActive = activeFilters.length === 0;

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
    <Card className="border border-white/10 bg-slate-950/72 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <CardHeader className="items-start justify-between gap-3 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontalIcon
              size={14}
              className="shrink-0 text-cyan-300"
            />
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Filter by Tool
            </p>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {isAllActive
              ? "Showing all toolchains"
              : `${activeFilters.length} selected`}
          </p>
        </div>

        {!isAllActive ? (
          <Button
            size="sm"
            radius="full"
            variant="light"
            onPress={clearFilters}
            className="text-slate-300"
          >
            Clear
          </Button>
        ) : null}
      </CardHeader>

      <CardBody className="pt-0">
        <ScrollShadow
          className="max-h-[220px] overflow-y-auto pr-1 md:max-h-none md:overflow-visible md:pr-0"
        >
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              radius="full"
              variant={isAllActive ? "flat" : "bordered"}
              onPress={clearFilters}
              className="justify-start border-white/10 px-3 text-xs font-medium text-slate-300 transition-transform data-[hover=true]:scale-[1.02]"
              style={
                isAllActive
                  ? {
                      backgroundColor: "rgba(34, 211, 238, 0.16)",
                      borderColor: "rgba(34, 211, 238, 0.4)",
                      color: "#22D3EE",
                    }
                  : undefined
              }
            >
              All
            </Button>

            {sortedTools.map((tool) => {
              const isActive = activeFilters.includes(tool);
              const { color, label } = getToolBranding(tool);

              return (
                <Button
                  key={tool}
                  size="sm"
                  radius="full"
                  variant={isActive ? "flat" : "bordered"}
                  startContent={<ToolLogoBadge tool={tool} size="sm" />}
                  onPress={() => toggleFilter(tool)}
                  className="justify-start border-white/10 bg-white/[0.02] px-3 text-xs font-medium text-slate-300 transition-transform data-[hover=true]:scale-[1.02]"
                  style={
                    isActive
                      ? {
                          backgroundColor: withAlpha(color, 0.16),
                          borderColor: withAlpha(color, 0.4),
                          color,
                        }
                      : undefined
                  }
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </ScrollShadow>
      </CardBody>
    </Card>
  );
}
