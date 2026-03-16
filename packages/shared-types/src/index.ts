export const KNOWN_TOOLS = [
  "aider",
  "antigravity",
  "claude_code",
  "cline",
  "codex",
  "continue",
  "cursor",
  "zed",
] as const

export type ToolId = (typeof KNOWN_TOOLS)[number]

export interface HeartbeatPayload {
  anon_id: string
  tools: ToolId[]
  ts: number
}

export interface ClusterPoint {
  lat: number
  lng: number
  count: number
  tools: Partial<Record<ToolId, number>>
  city: string | null
  country: string | null
}

export interface ClustersResponse {
  clusters: ClusterPoint[]
  total_active: number
  last_updated: string
}

export interface StatsResponse {
  total_active: number
  by_tool: Partial<Record<ToolId, number>>
  by_country: Record<string, number>
  last_updated: string
}

export const TOOL_LABELS: Record<ToolId, string> = {
  aider: "Aider",
  antigravity: "Antigravity",
  claude_code: "Claude Code",
  cline: "Cline",
  codex: "Codex",
  continue: "Continue",
  cursor: "Cursor",
  zed: "Zed",
}

export interface RegionData {
  count: number
  dominantTool: ToolId
}

export interface ChoroplethResponse {
  countries: Record<string, RegionData>
  regions: Record<string, RegionData>
  last_updated: string
}

export const TOOL_COLORS: Record<ToolId, string> = {
  aider: "#EF4444",
  antigravity: "#3186FF",
  claude_code: "#D97757",
  cline: "#6366F1",
  codex: "#10A37F",
  continue: "#F59E0B",
  cursor: "#8B5CF6",
  zed: "#A3E635",
}

export type ToolLogoSurface = "transparent" | "light" | "dark"

export interface ToolBranding {
  label: string
  color: string
  localLogoPath: string
  logoSurface: ToolLogoSurface
}

// Local logo paths for tools (relative to /logos/ in public folder)
const TOOL_LOCAL_LOGOS: Record<ToolId, string> = {
  aider: "/logos/aider.png",
  antigravity: "/logos/antigravity-color.png",
  claude_code: "/logos/claude-ai-icon.svg",
  cline: "/logos/cline.png",
  codex: "/logos/codex-color.svg",
  continue: "/logos/continue.png",
  cursor: "/logos/cursor.svg",
  zed: "/logos/zed.png",
}

const TOOL_LOGO_SURFACES: Record<ToolId, ToolLogoSurface> = {
  aider: "transparent",
  antigravity: "light",
  claude_code: "light",
  cline: "transparent",
  codex: "light",
  continue: "transparent",
  cursor: "light",
  zed: "transparent",
}

export function getToolBranding(tool: string): ToolBranding {
  const toolId = tool as ToolId
  return {
    label: TOOL_LABELS[toolId] ?? tool,
    color: TOOL_COLORS[toolId] ?? "#6B7280",
    localLogoPath: TOOL_LOCAL_LOGOS[toolId] ?? "",
    logoSurface: TOOL_LOGO_SURFACES[toolId] ?? "transparent",
  }
}
