"use client";

import { Avatar } from "@heroui/react";
import { getToolBranding, type ToolLogoSurface } from "@vibe/shared-types";

interface ToolLogoBadgeProps {
  tool: string;
  size?: "sm" | "md";
}

const SIZE_STYLES = {
  sm: {
    container: "h-6 w-6 rounded-md",
    image: "",
    fallback: "text-[9px]",
  },
  md: {
    container: "h-8 w-8 rounded-md",
    image: "",
    fallback: "text-[10px]",
  },
} as const;

const SURFACE_BACKGROUNDS: Record<ToolLogoSurface, string> = {
  transparent: "rgba(255,255,255,0.04)",
  light: "rgba(255,255,255,0.96)",
  dark: "rgba(3,7,18,0.92)",
};

export function ToolLogoBadge({ tool, size = "sm" }: ToolLogoBadgeProps) {
  const { label, color, localLogoPath, logoSurface } = getToolBranding(tool);
  const styles = SIZE_STYLES[size];

  return (
    <Avatar
      src={localLogoPath || undefined}
      name={label}
      showFallback
      radius="sm"
      className={`shrink-0 border ${styles.container}`}
      classNames={{
        base: "bg-transparent",
        img: "object-contain p-0.5",
        fallback: "bg-transparent",
      }}
      fallback={
        <span
          className={`font-semibold uppercase ${styles.fallback}`}
          style={{ color }}
        >
          {label.charAt(0)}
        </span>
      }
      imgProps={{
        alt: `${label} logo`,
        loading: "lazy",
      }}
      style={{
        backgroundColor: SURFACE_BACKGROUNDS[logoSurface],
        borderColor: `${color}33`,
      }}
      aria-hidden="true"
    />
  );
}
