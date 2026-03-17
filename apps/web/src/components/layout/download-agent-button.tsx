"use client";

import Image from "next/image";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Link,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  useDisclosure,
} from "@heroui/react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { ActivityIcon } from "@/components/ui/activity";
import { DownloadIcon } from "@/components/ui/download";
import { LinkIcon } from "@/components/ui/link";
import { XIcon } from "@/components/ui/x";

type AnimatedIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

type ReleaseDownload = {
  arch: "apple-silicon" | "intel" | "universal";
  label: string;
  name: string;
  size: number;
  url: string;
};

type LatestReleaseResponse = {
  publishedAt: string | null;
  releaseName: string;
  releaseUrl: string;
  tagName: string;
  downloads: ReleaseDownload[];
  unavailableReason?: string;
};

const releaseDateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getAnimatedIconHandlers(
  iconRef: RefObject<AnimatedIconHandle | null>,
) {
  return {
    onMouseEnter: () => iconRef.current?.startAnimation(),
    onMouseLeave: () => iconRef.current?.stopAnimation(),
    onFocus: () => iconRef.current?.startAnimation(),
    onBlur: () => iconRef.current?.stopAnimation(),
  };
}

export function DownloadAgentButton() {
  const { isOpen, onOpen, onClose, onOpenChange } = useDisclosure({
    onOpen: () => {
      console.info("[DownloadAgentButton] open committed");
    },
    onClose: () => {
      console.info("[DownloadAgentButton] close requested", {
        source: "disclosure-close",
      });
    },
    onChange: (open) => {
      console.info("[DownloadAgentButton] state requested", { open });
    },
  });
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );
  const triggerIconRef = useRef<AnimatedIconHandle | null>(null);
  const errorLinkIconRef = useRef<AnimatedIconHandle | null>(null);
  const downloadIconRefs = useRef<Record<string, AnimatedIconHandle | null>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(false);
  const [release, setRelease] = useState<LatestReleaseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.info("[DownloadAgentButton] mounted");
    setPortalContainer(document.body);
  }, []);

  useEffect(() => {
    console.info("[DownloadAgentButton] state change", {
      isOpen,
      isLoading,
      hasRelease: Boolean(release),
      hasError: Boolean(error),
    });
  }, [error, isLoading, isOpen, release]);

  async function loadRelease() {
    if (isLoading) {
      console.info("[DownloadAgentButton] fetch skipped: already loading");
      return;
    }

    console.info("[DownloadAgentButton] fetch start");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/releases/latest", {
        cache: "no-store",
      });

      if (!response.ok) {
        console.error("[DownloadAgentButton] fetch failed", response.status);
        throw new Error("Latest release could not be loaded.");
      }

      const data = (await response.json()) as LatestReleaseResponse;
      console.info("[DownloadAgentButton] fetch success", {
        releaseName: data.releaseName,
        downloads: data.downloads.length,
      });
      setRelease(data);
    } catch {
      console.error("[DownloadAgentButton] fetch error");
      setError("Latest macOS builds are unavailable right now.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen || release || isLoading) {
      return;
    }

    void loadRelease();
  }, [isLoading, isOpen, release]);

  return (
    <>
      <Button
        size="sm"
        radius="full"
        variant="bordered"
        onPress={() => {
          console.info("[DownloadAgentButton] open requested", {
            source: "press",
          });
          onOpen();
        }}
        {...getAnimatedIconHandlers(triggerIconRef)}
        className="h-9 border-white/12 bg-slate-900/70 px-4 text-sm font-medium text-slate-100 shadow-lg shadow-black/10 backdrop-blur transition-all hover:border-cyan-400/35 hover:bg-slate-900 active:scale-[0.98]"
      >
        <DownloadIcon ref={triggerIconRef} size={16} className="shrink-0" />
        Download Agent
      </Button>

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        portalContainer={portalContainer ?? undefined}
        size="3xl"
        placement="center"
        backdrop="blur"
        isDismissable={false}
        scrollBehavior="inside"
        hideCloseButton
        classNames={{
          wrapper:
            "fixed inset-0 z-[500] flex h-[100dvh] w-screen items-center justify-center overflow-x-auto overflow-y-auto px-4 py-6 sm:px-6",
          backdrop:
            "fixed inset-0 z-[490] h-screen w-screen bg-slate-950/80 backdrop-blur-sm",
          base: "relative z-[500] mx-auto my-auto flex w-full max-w-4xl flex-col overflow-hidden border border-white/10 bg-[linear-gradient(180deg,rgba(3,7,18,0.98),rgba(2,6,23,0.96))] text-slate-50 shadow-2xl shadow-black/40 max-h-[calc(100dvh-3rem)]",
          header: "px-6 pb-0 pt-6 md:px-7 md:pt-7",
          body: "space-y-4 px-6 py-4 md:px-7",
          footer:
            "border-t border-white/8 bg-white/[0.015] px-6 py-4 md:px-7",
        }}
      >
        <ModalContent className="w-full max-w-4xl">
          {() => (
            <>
              <ModalHeader className="flex items-start justify-between gap-4">
                <div className="space-y-4">
                  <Chip
                    size="sm"
                    radius="full"
                    variant="bordered"
                    color="primary"
                    classNames={{
                      base: "h-8 min-h-0 w-fit border-primary/25 bg-primary/10 px-3",
                      content:
                        "text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300",
                    }}
                  >
                    <span className="flex items-center gap-1.5">
                      <DownloadIcon size={12} className="shrink-0" />
                      <span>Client builds</span>
                    </span>
                  </Chip>

                  <div className="space-y-1">
                    <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white">
                      Download the desktop agent
                    </h2>
                    <p className="max-w-xl text-base leading-7 text-slate-400">
                      The actions below are generated from the latest GitHub
                      release.
                    </p>
                  </div>
                </div>

                <Button
                  isIconOnly
                  variant="light"
                  radius="full"
                  onPress={() => {
                    console.info("[DownloadAgentButton] close requested", {
                      source: "close-button",
                    });
                    onClose();
                  }}
                  className="mt-1 h-10 min-h-0 w-10 min-w-0 text-slate-500 hover:bg-white/5 hover:text-white"
                  aria-label="Close download modal"
                >
                  x
                </Button>
              </ModalHeader>

              <ModalBody>
                {isLoading ? (
                  <Card
                    shadow="sm"
                    className="border border-white/8 bg-white/[0.03]"
                  >
                    <CardBody className="flex flex-row items-center gap-3 p-4">
                      <Spinner size="sm" color="primary" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-white">
                          Loading the latest macOS release
                        </p>
                        <p className="text-xs text-slate-400">
                          Fetching build artifacts from GitHub.
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                ) : null}

                {error ? (
                  <Card
                    shadow="sm"
                    className="border border-danger/30 bg-danger/10"
                  >
                    <CardBody className="gap-3 p-4">
                      <p className="text-sm text-danger-50">{error}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          color="danger"
                          variant="flat"
                          onPress={() => void loadRelease()}
                        >
                          Retry
                        </Button>
                        <Button
                          as="a"
                          href="https://github.com/borabiricik/vibe-coders-map/releases"
                          target="_blank"
                          rel="noopener noreferrer"
                          size="sm"
                          variant="light"
                          startContent={
                            <LinkIcon
                              ref={errorLinkIconRef}
                              size={14}
                              className="shrink-0"
                            />
                          }
                          {...getAnimatedIconHandlers(errorLinkIconRef)}
                          className="text-danger-100"
                        >
                          Open releases page
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                ) : null}

                {!isLoading && !error && release ? (
                  <>
                    <Card
                      shadow="sm"
                      className="border border-white/8 bg-white/[0.03]"
                    >
                      <CardBody className="gap-3 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xl font-semibold tracking-[-0.03em] text-white">
                              {release.releaseName}
                            </p>
                            <p className="mt-2 text-sm text-slate-400">
                              {release.tagName}
                            </p>
                          </div>

                          {release.publishedAt ? (
                            <Chip
                              size="sm"
                              radius="full"
                              variant="bordered"
                              color="primary"
                              classNames={{
                                base: "h-8 min-h-0 border-primary/20 bg-primary/10 px-3",
                                content: "text-xs font-medium text-cyan-300",
                              }}
                            >
                              <span className="flex items-center gap-1.5">
                                <ActivityIcon
                                  size={12}
                                  className="shrink-0"
                                />
                                <span>
                                  {releaseDateFormatter.format(
                                    new Date(release.publishedAt),
                                  )}
                                </span>
                              </span>
                            </Chip>
                          ) : null}
                        </div>
                      </CardBody>
                    </Card>

                    {release.downloads.length > 0 ? (
                      <div className="space-y-3">
                        {release.downloads.map((download) => (
                          <Button
                            key={download.url}
                            as="a"
                            href={download.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="light"
                            radius="lg"
                            {...getAnimatedIconHandlers({
                              current: downloadIconRefs.current[download.url],
                            })}
                            className="h-auto w-full justify-between rounded-2xl border border-white/8 bg-white/[0.04] px-5 py-4 text-left transition-all hover:border-cyan-400/25 hover:bg-white/[0.06]"
                          >
                            <span className="flex min-w-0 items-center gap-4">
                              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-inner shadow-white/5">
                                <Image
                                  src="/logo.png"
                                  alt="Vibe Coders desktop app icon"
                                  width={32}
                                  height={32}
                                  className="h-8 w-8 object-contain"
                                />
                              </span>

                              <span className="flex min-w-0 flex-col items-start">
                                <span className="text-lg font-semibold tracking-[-0.03em] text-white">
                                  {download.label}
                                </span>
                                <span className="mt-1 text-sm text-slate-400">
                                  {download.name} • {formatFileSize(download.size)}
                                </span>
                              </span>
                            </span>
                            <span className="inline-flex h-9 shrink-0 items-center rounded-full bg-cyan-400 px-4 text-sm font-medium text-slate-950 shadow-md shadow-cyan-950/20">
                              <span className="inline-flex items-center gap-2">
                                <DownloadIcon
                                  ref={(node) => {
                                    downloadIconRefs.current[download.url] = node;
                                  }}
                                  size={14}
                                  className="shrink-0"
                                />
                                <span>Download</span>
                              </span>
                            </span>
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <Card
                        shadow="sm"
                        className="border border-white/8 bg-white/[0.03]"
                      >
                        <CardBody className="p-4 text-sm text-slate-300">
                          {release.unavailableReason ??
                            "No macOS assets were found in the latest release."}
                        </CardBody>
                      </Card>
                    )}
                  </>
                ) : null}
              </ModalBody>

              <ModalFooter className="flex items-center justify-between gap-3">
                <Link
                  href={
                    release?.releaseUrl ??
                    "https://github.com/borabiricik/vibe-coders-map/releases"
                  }
                  isExternal
                  className="text-sm font-medium text-slate-400 data-[hover=true]:text-white"
                >
                  <span className="inline-flex items-center gap-2">
                    <span>View all release assets</span>
                    <LinkIcon size={14} className="shrink-0" />
                  </span>
                </Link>

                <Button
                  variant="bordered"
                  radius="full"
                  onPress={() => {
                    console.info("[DownloadAgentButton] close requested", {
                      source: "footer-close",
                    });
                    onClose();
                  }}
                  className="h-9 border-white/10 px-4 text-slate-200 hover:bg-white/5"
                >
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
