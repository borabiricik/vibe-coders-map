"use client";

import { getToolBranding, type ToolLogoSurface } from "@vibe/shared-types";
import Image from "next/image"

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
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden ${styles.container}`}
      style={{
        backgroundColor: SURFACE_BACKGROUNDS[logoSurface],
        borderColor: `${color}33`,
      }}
      aria-hidden="true"
    >
      {localLogoPath ? (
        <Image
          width={32}
          height={32}
          src={localLogoPath}
          alt={`${label} logo`}
          className={`${styles.image} h-full w-full object-contain p-0.5`}
          loading="lazy"
        />
      ) : (
        <span
          className={`font-semibold uppercase ${styles.fallback}`}
          style={{ color }}
        >
          {label.charAt(0)}
        </span>
      )}
    </span>
  );
}
