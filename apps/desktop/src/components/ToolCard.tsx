import { getToolBranding } from "@vibe/shared-types";
import { ToolLogoBadge } from "./ToolLogoBadge";

interface ToolCardProps {
  name: string;
  online: boolean;
}

export function ToolCard({ name, online }: ToolCardProps) {
  const { color, label } = getToolBranding(name);

  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 transition-colors hover:border-gray-700"
      style={{
        boxShadow: online ? `inset 0 0 0 1px ${color}26` : undefined,
        opacity: online ? 1 : 0.68,
      }}
    >
      <ToolLogoBadge tool={name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" style={{ color }}>
          {label}
        </p>
        <div className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-400" : "bg-gray-600"}`}
          />
          <span
            className={`text-xs ${online ? "text-emerald-400" : "text-gray-500"}`}
          >
            {online ? "Online" : "Offline"}
          </span>
        </div>
      </div>
    </div>
  );
}
