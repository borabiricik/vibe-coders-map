import { Header } from "@/components/layout/header";
import { VibeMap } from "@/components/map/vibe-map";
import { GlobalStats } from "@/components/stats/global-stats";
import { ToolFilter } from "@/components/stats/tool-filter";

export default function Home() {
  return (
    <div className="flex h-dvh flex-col">
      <Header />
      <main className="relative flex-1">
        <VibeMap />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-4">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="pointer-events-auto">
              <GlobalStats />
            </div>
            <div className="pointer-events-auto">
              <ToolFilter />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
