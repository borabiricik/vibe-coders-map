"use client";

import { Card, CardBody, CardHeader, Chip, Divider, Skeleton } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { getToolBranding } from "@vibe/shared-types";
import { fetchStats } from "@/lib/api";
import { ActivityIcon } from "@/components/ui/activity";
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
      <Card className="min-w-[240px] border border-white/10 bg-slate-950/72 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <CardBody className="gap-3 p-4">
          <Skeleton className="h-4 w-32 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Divider className="bg-white/8" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-4 w-4/5 rounded-lg" />
            <Skeleton className="h-4 w-3/5 rounded-lg" />
          </div>
        </CardBody>
      </Card>
    );
  }

  const topTools = Object.entries(data.by_tool)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
    .slice(0, 5);

  const minutesAgo = data.last_updated
    ? Math.round((Date.now() - new Date(data.last_updated).getTime()) / 60000)
    : null;

  return (
    <Card className="min-w-[240px] border border-white/10 bg-slate-950/72 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <CardHeader className="items-start justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <ActivityIcon
              size={14}
              className="shrink-0 text-cyan-300"
            />
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Active Vibe Coders
            </p>
          </div>
          <p className="mt-1 text-3xl font-bold tabular-nums text-white">
            {data.total_active.toLocaleString()}
          </p>
        </div>

        <Chip
          size="sm"
          radius="full"
          variant="flat"
          color="success"
          classNames={{
            base: "h-7 min-h-0 border border-success/25 bg-success/15 px-2",
            content: "text-[11px] font-semibold text-success",
          }}
        >
          <span className="flex items-center gap-1.5">
            <ActivityIcon size={12} className="shrink-0" />
            <span>Live</span>
          </span>
        </Chip>
      </CardHeader>

      <CardBody className="gap-3 pt-2">
        {topTools.length > 0 ? (
          <>
            <Divider className="bg-white/8" />
            <div className="space-y-2">
              {topTools.map(([tool, count]) => {
                const { label, color } = getToolBranding(tool);

                return (
                  <div
                    key={tool}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <ToolLogoBadge tool={tool} size="md" />
                      <span className="truncate" style={{ color }}>
                        {label}
                      </span>
                    </div>
                    <span className="font-medium tabular-nums text-slate-400">
                      {(count ?? 0).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}

        {minutesAgo != null ? (
          <Chip
            size="sm"
            radius="full"
            className="h-6 min-h-0 w-fit text-slate-400 text-xs"
          >
            Updated {minutesAgo < 1 ? "just now" : `${minutesAgo}m ago`}
          </Chip>
        ) : null}
      </CardBody>
    </Card>
  );
}
