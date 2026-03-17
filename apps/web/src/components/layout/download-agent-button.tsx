"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

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

export function DownloadAgentButton() {
  const dialogId = useId();
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [release, setRelease] = useState<LatestReleaseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  async function openModal() {
    setIsOpen(true);

    if (release || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/releases/latest", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Latest release could not be loaded.");
      }

      const data = (await response.json()) as LatestReleaseResponse;
      setRelease(data);
    } catch {
      setError("Latest macOS builds are unavailable right now.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void openModal()}
        className="rounded-full border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
      >
        Download Agent
      </button>

      {isOpen && isMounted
        ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 p-4 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            id={dialogId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${dialogId}-title`}
            className="max-h-[min(80dvh,720px)] w-full max-w-md overflow-y-auto rounded-3xl border border-gray-800 bg-gray-950/95 p-6 shadow-2xl shadow-black/40"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-cyan-400">
                  macOS builds
                </p>
                <h2
                  id={`${dialogId}-title`}
                  className="text-xl font-semibold tracking-tight text-white"
                >
                  Download the desktop agent
                </h2>
                <p className="text-sm text-gray-400">
                  The buttons below are generated from the latest GitHub
                  release.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-gray-800 px-2.5 py-1 text-sm text-gray-400 transition-colors hover:border-gray-600 hover:text-white"
                aria-label="Close download modal"
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {isLoading ? (
                <div className="rounded-2xl border border-gray-800 bg-gray-900/60 px-4 py-5 text-sm text-gray-300">
                  Loading the latest macOS release...
                </div>
              ) : null}

              {error ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-5 text-sm text-red-100">
                  <p>{error}</p>
                  <a
                    href="https://github.com/borabiricik/vibe-coders-map/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex text-sm font-medium text-red-200 underline decoration-red-300/40 underline-offset-4 hover:text-white"
                  >
                    Open releases page
                  </a>
                </div>
              ) : null}

              {!isLoading && !error && release ? (
                <>
                  <div className="rounded-2xl border border-gray-800 bg-gray-900/60 px-4 py-4">
                    <p className="text-sm font-medium text-white">
                      {release.releaseName}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {release.tagName}
                      {release.publishedAt
                        ? ` • ${releaseDateFormatter.format(
                            new Date(release.publishedAt),
                          )}`
                        : ""}
                    </p>
                  </div>

                  {release.downloads.length > 0 ? (
                    <div className="space-y-3">
                      {release.downloads.map((download) => (
                        <a
                          key={download.url}
                          href={download.url}
                          className="flex items-center justify-between rounded-2xl border border-gray-800 bg-gray-900/70 px-4 py-4 transition-colors hover:border-cyan-400/60 hover:bg-gray-900"
                        >
                          <span>
                            <span className="block text-sm font-medium text-white">
                              {download.label}
                            </span>
                            <span className="mt-1 block text-xs text-gray-400">
                              {download.name} • {formatFileSize(download.size)}
                            </span>
                          </span>
                          <span className="rounded-full border border-cyan-400/40 px-3 py-1 text-xs font-medium text-cyan-300">
                            Download
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-gray-800 bg-gray-900/60 px-4 py-5 text-sm text-gray-300">
                      {release.unavailableReason ??
                        "No macOS assets were found in the latest release."}
                    </div>
                  )}

                  <a
                    href={release.releaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex text-sm font-medium text-gray-400 underline decoration-gray-600 underline-offset-4 transition-colors hover:text-white"
                  >
                    View all release assets
                  </a>
                </>
              ) : null}
            </div>
          </div>
        </div>,
            document.body,
          )
        : null}
    </>
  );
}
