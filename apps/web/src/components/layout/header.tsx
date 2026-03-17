import { Chip, Navbar, NavbarBrand, NavbarContent } from "@heroui/react";
import { DownloadAgentButton } from "@/components/layout/download-agent-button";
import { ActivityIcon } from "@/components/ui/activity";

export function Header() {
  return (
    <Navbar
      position="static"
      maxWidth="full"
      height="3.5rem"
      isBordered
      isBlurred
      classNames={{
        base: "z-20 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/60",
        wrapper: "h-14 max-w-full px-4 md:px-5",
        brand: "grow-0 gap-3",
        content: "basis-auto",
      }}
    >
      <NavbarBrand className="gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-success/20 bg-success/10 text-success">
          <ActivityIcon size={14} className="shrink-0" />
        </span>

        <div className="flex items-center gap-2.5">
          <h1 className="text-base font-semibold tracking-tight text-white">
            Vibe Coders Map
          </h1>
          <Chip
            size="sm"
            radius="full"
            variant="flat"
            color="success"
            classNames={{
              base: "h-7 min-h-0 border border-success/25 bg-success/15 px-2",
              content: "text-[10px] font-semibold uppercase tracking-[0.14em] text-success",
            }}
          >
            <span className="flex items-center gap-1.5">
              <ActivityIcon size={12} className="shrink-0" />
              <span>Live</span>
            </span>
          </Chip>
        </div>
      </NavbarBrand>

      <NavbarContent as="div" justify="end" className="pointer-events-auto">
        <DownloadAgentButton />
      </NavbarContent>
    </Navbar>
  );
}
