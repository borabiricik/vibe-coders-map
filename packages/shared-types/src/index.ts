export const KNOWN_TOOLS = [
  "cursor",
  "windsurf",
  "claude_code",
  "copilot",
  "aider",
  "zed",
  "jetbrains_ai",
  "cline",
  "roo_code",
  "continue",
] as const;

export type ToolId = (typeof KNOWN_TOOLS)[number];

export interface HeartbeatPayload {
  anon_id: string;
  tools: ToolId[];
  ts: number;
}

export interface ClusterPoint {
  lat: number;
  lng: number;
  count: number;
  tools: Partial<Record<ToolId, number>>;
  city: string | null;
  country: string | null;
}

export interface ClustersResponse {
  clusters: ClusterPoint[];
  total_active: number;
  last_updated: string;
}

export interface StatsResponse {
  total_active: number;
  by_tool: Partial<Record<ToolId, number>>;
  by_country: Record<string, number>;
  last_updated: string;
}

export const TOOL_LABELS: Record<ToolId, string> = {
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

export interface RegionData {
  count: number;
  dominantTool: ToolId;
}

export interface ChoroplethResponse {
  countries: Record<string, RegionData>;
  regions: Record<string, RegionData>;
  last_updated: string;
}

export const TOOL_COLORS: Record<ToolId, string> = {
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
