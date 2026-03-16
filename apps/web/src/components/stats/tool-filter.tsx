"use client";

import { KNOWN_TOOLS, TOOL_LABELS, TOOL_COLORS, type ToolId } from "@vibe/shared-types";
import { useMapStore } from "@/hooks/use-map-viewport";

export function ToolFilter() {
  const activeFilters = useMapStore((s) => s.activeFilters);
  const toggleFilter = useMapStore((s) => s.toggleFilter);
  const clearFilters = useMapStore((s) => s.clearFilters);

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
        {KNOWN_TOOLS.map((tool) => {
          const isActive = activeFilters.includes(tool);
          const color = TOOL_COLORS[tool];
          return (
            <button
              key={tool}
              onClick={() => toggleFilter(tool)}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all"
              style={{
                backgroundColor: isActive ? `${color}22` : "transparent",
                borderWidth: 1,
                borderColor: isActive ? `${color}66` : "rgba(75,85,99,0.5)",
                color: isActive ? color : "#9CA3AF",
              }}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              {TOOL_LABELS[tool]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
