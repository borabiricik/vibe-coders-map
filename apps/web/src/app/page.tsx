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
        {/* Desktop: top-right, Mobile: bottom */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-4 md:inset-x-auto md:bottom-auto md:right-0 md:top-20 md:max-w-[280px]">
          <div className="flex flex-col items-stretch gap-3">
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
