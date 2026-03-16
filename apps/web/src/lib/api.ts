import type { ChoroplethResponse, ClustersResponse, StatsResponse } from "@vibe/shared-types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787"

export async function fetchClusters(zoom: number): Promise<ClustersResponse> {
  const res = await fetch(
    `${API_BASE}/api/v1/clusters?zoom=${Math.round(zoom)}`,
  )
  if (!res.ok) throw new Error(`Failed to fetch clusters: ${res.status}`)
  return res.json()
}

export async function fetchStats(): Promise<StatsResponse> {
  const res = await fetch(`${API_BASE}/api/v1/stats`)
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`)
  return res.json()
}

export async function fetchChoropleth(): Promise<ChoroplethResponse> {
  const res = await fetch(`${API_BASE}/api/v1/choropleth`)
  if (!res.ok) throw new Error(`Failed to fetch choropleth: ${res.status}`)
  return res.json()
}
