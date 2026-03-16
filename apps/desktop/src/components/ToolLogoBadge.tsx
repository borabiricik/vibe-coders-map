import { getToolBranding, type ToolLogoSurface } from "@vibe/shared-types";

interface ToolLogoBadgeProps {
  tool: string;
}

const SURFACE_BACKGROUNDS: Record<ToolLogoSurface, string> = {
  transparent: "rgba(255,255,255,0.04)",
  light: "rgba(255,255,255,0.96)",
  dark: "rgba(3,7,18,0.92)",
};

export function ToolLogoBadge({ tool }: ToolLogoBadgeProps) {
  const { label, color, localLogoPath, logoSurface } = getToolBranding(tool);

  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border"
      style={{
        backgroundColor: SURFACE_BACKGROUNDS[logoSurface],
        borderColor: `${color}33`,
      }}
      aria-hidden="true"
    >
      {localLogoPath ? (
        <img
          src={localLogoPath}
          alt={`${label} logo`}
          className="h-full w-full object-contain p-1"
          loading="lazy"
          draggable={false}
        />
      ) : (
        <span className="text-sm font-semibold uppercase" style={{ color }}>
          {label.charAt(0)}
        </span>
      )}
    </span>
  );
}
