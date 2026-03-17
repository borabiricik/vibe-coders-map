"use client";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Skeleton,
} from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { useRef, type RefObject } from "react";
import { getToolBranding } from "@vibe/shared-types";
import { fetchChoropleth } from "@/lib/api";
import { ToolLogoBadge } from "@/components/stats/tool-logo-badge";
import { ActivityIcon } from "@/components/ui/activity";
import { MapPinIcon } from "@/components/ui/map-pin";
import { XIcon } from "@/components/ui/x";

type AnimatedIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

function getAnimatedIconHandlers(
  iconRef: RefObject<AnimatedIconHandle | null>,
) {
  return {
    onMouseEnter: () => iconRef.current?.startAnimation(),
    onMouseLeave: () => iconRef.current?.stopAnimation(),
    onFocus: () => iconRef.current?.startAnimation(),
    onBlur: () => iconRef.current?.stopAnimation(),
  };
}

interface RegionPopupProps {
  type: "country" | "region";
  code: string;
  name: string;
  onClose: () => void;
}

export function RegionPopup({ type, code, name, onClose }: RegionPopupProps) {
  const closeIconRef = useRef<AnimatedIconHandle | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["choropleth"],
    queryFn: fetchChoropleth,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });

  const regionData =
    type === "country" ? data?.countries?.[code] : data?.regions?.[code];

  return (
    <Card className="min-w-[220px] border border-white/10 bg-slate-950/90 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <CardHeader className="items-start justify-between gap-3 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MapPinIcon size={14} className="shrink-0 text-cyan-300" />
            <p className="text-sm font-semibold text-white">{name}</p>
          </div>
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.24em] text-slate-500">
            <span className="sr-only">Type</span>
            {type === "country" ? "Country snapshot" : "Region snapshot"}
          </p>
        </div>

        <Button
          isIconOnly
          size="sm"
          radius="full"
          variant="light"
          onPress={onClose}
          {...getAnimatedIconHandlers(closeIconRef)}
          className="text-slate-400"
        >
          <XIcon ref={closeIconRef} size={14} className="shrink-0" />
        </Button>
      </CardHeader>

      <CardBody className="gap-3 pt-0">
        {isLoading ? (
          <>
            <Skeleton className="h-4 w-24 rounded-lg" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </>
        ) : !regionData ? (
          <p className="text-xs text-slate-400">No active coders</p>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                  Active Coders
                </span>
                <p className="mt-1 text-2xl font-bold tabular-nums text-white">
                  {regionData.count.toLocaleString()}
                </p>
              </div>

              <Chip
                size="sm"
                radius="full"
                variant="flat"
                color="primary"
                className="h-7 min-h-0 border border-success/25 bg-success/15 px-2 text-success"
              >
                <span className="flex items-center gap-1.5">
                  <ActivityIcon size={12} className="shrink-0" />
                  <span>Live</span>
                </span>
              </Chip>
            </div>

            <Divider className="bg-white/10" />

            <Card
              shadow="none"
              className="border border-white/8 bg-white/5"
            >
              <CardBody className="flex flex-row items-center gap-3 p-3">
                <ToolLogoBadge tool={regionData.dominantTool} size="md" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                    Top Tool
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: getToolBranding(regionData.dominantTool).color }}
                  >
                    {getToolBranding(regionData.dominantTool).label}
                  </span>
                </div>
              </CardBody>
            </Card>
          </>
        )}
      </CardBody>
    </Card>
  );
}
