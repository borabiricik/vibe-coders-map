"use client";

import { create } from "zustand";
import type { ToolId } from "@/types";

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface MapState {
  zoom: number;
  latitude: number;
  longitude: number;
  bounds: Bounds | null;
  activeFilters: ToolId[];
  setViewport: (zoom: number, lat: number, lng: number) => void;
  setBounds: (bounds: Bounds) => void;
  toggleFilter: (tool: ToolId) => void;
  clearFilters: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  zoom: 2,
  latitude: 30,
  longitude: 10,
  bounds: null,
  activeFilters: [],
  setViewport: (zoom, latitude, longitude) =>
    set({ zoom, latitude, longitude }),
  setBounds: (bounds) => set({ bounds }),
  toggleFilter: (tool) =>
    set((s) => ({
      activeFilters: s.activeFilters.includes(tool)
        ? s.activeFilters.filter((t) => t !== tool)
        : [...s.activeFilters, tool],
    })),
  clearFilters: () => set({ activeFilters: [] }),
}));
