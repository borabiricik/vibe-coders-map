const TOOL_COLORS: Record<string, string> = {
  cursor: "#8B5CF6",
  windsurf: "#14B8A6",
  claude_code: "#F97316",
  copilot: "#3B82F6",
  aider: "#EF4444",
  zed: "#A3E635",
  jetbrains_ai: "#EC4899",
  cline: "#6366F1",
  roo_code: "#06B6D4",
  continue: "#F59E0B",
};

const TOOL_LABELS: Record<string, string> = {
  cursor: "Cursor",
  windsurf: "Windsurf",
  claude_code: "Claude Code",
  copilot: "GitHub Copilot",
  aider: "Aider",
  zed: "Zed",
  jetbrains_ai: "JetBrains AI",
  cline: "Cline",
  roo_code: "Roo Code",
  continue: "Continue",
};

interface ToolCardProps {
  name: string;
  active: boolean;
}

export function ToolCard({ name, active }: ToolCardProps) {
  const color = TOOL_COLORS[name] ?? "#6B7280";
  const label = TOOL_LABELS[name] ?? name;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 transition-colors hover:border-gray-700">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {label.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-100">{label}</p>
        <div className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-gray-600"}`}
          />
          <span
            className={`text-xs ${active ? "text-emerald-400" : "text-gray-500"}`}
          >
            {active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>
    </div>
  );
}
