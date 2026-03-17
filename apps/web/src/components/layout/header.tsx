import Image from "next/image";
import { Chip } from "@heroui/react";
import { DownloadAgentButton } from "@/components/layout/download-agent-button";
import { ActivityIcon } from "@/components/ui/activity";

export function Header() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-20 px-4 sm:top-5 sm:px-6">
      <div className="pointer-events-auto mx-auto flex w-full max-w-5xl items-center justify-between gap-3 rounded-full border border-white/12 bg-slate-950/68 px-3 py-2 shadow-[0_20px_60px_rgba(2,6,23,0.5)] backdrop-blur-2xl supports-[backdrop-filter]:bg-slate-950/58">
        <div className="flex min-w-0 items-center gap-3 rounded-full pl-1">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] shadow-inner shadow-white/10">
            <Image
              src="/logo.png"
              alt="Vibe Coders desktop app icon"
              width={28}
              height={28}
              className="h-8 w-8 object-cover"
              priority
            />
          </span>

          <div className="flex min-w-0 items-center gap-2.5">
            <h1 className="truncate text-sm font-semibold tracking-[-0.03em] text-white sm:text-base">
              Vibe Coders Map
            </h1>
            <Chip
              size="sm"
              radius="full"
              variant="flat"
              color="success"
              classNames={{
                base: "hidden h-7 min-h-0 border border-emerald-400/25 bg-emerald-400/12 px-2.5 sm:inline-flex",
                content:
                  "text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300",
              }}
            >
              <span className="flex items-center gap-1.5">
                <ActivityIcon size={12} className="shrink-0" />
                <span>Live</span>
              </span>
            </Chip>
          </div>
        </div>

        <div className="shrink-0">
          <DownloadAgentButton />
        </div>
      </div>
    </header>
  );
}
