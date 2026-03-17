import { DownloadAgentButton } from "@/components/layout/download-agent-button";

export function Header() {
  return (
    <header className="relative z-20 flex h-14 items-center justify-between border-b border-gray-800/50 bg-gray-900/60 px-4 backdrop-blur-md">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
        </span>
        <h1 className="text-base font-semibold tracking-tight">
          Vibe Coders Map
        </h1>
        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
          LIVE
        </span>
      </div>

      <DownloadAgentButton />
    </header>
  );
}
