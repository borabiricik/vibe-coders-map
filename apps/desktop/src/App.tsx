import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { KNOWN_TOOLS, type ToolId } from "@vibe/shared-types";
import { ToolCard } from "./components/ToolCard";
import { Toggle } from "./components/Toggle";

const DETECTION_INTERVAL = 3 * 1000;
const HEARTBEAT_INTERVAL = 5 * 60 * 1000;
const ANON_ID_KEY = "vibe_anon_id";
const LAST_HEARTBEAT_ATTEMPT_AT_KEY = "vibe_last_heartbeat_attempt_at";
const IS_MAC = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
const HEADER_INTERACTIVE_SELECTOR =
  "button, a, input, select, textarea, summary, [role='button'], [data-no-drag='true']";
const TOOL_ORDER = new Map(KNOWN_TOOLS.map((tool, index) => [tool, index]));

function sortDetectedTools(tools: ToolId[]): ToolId[] {
  return [...tools].sort(
    (left, right) => (TOOL_ORDER.get(left) ?? Number.MAX_SAFE_INTEGER) - (TOOL_ORDER.get(right) ?? Number.MAX_SAFE_INTEGER),
  );
}

function areToolsEqual(left: ToolId[], right: ToolId[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((tool, index) => tool === right[index]);
}

function getOrCreateAnonId(): string {
  const existing = localStorage.getItem(ANON_ID_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(ANON_ID_KEY, id);
  return id;
}

function getStoredHeartbeatAttemptAt(): number | null {
  const stored = localStorage.getItem(LAST_HEARTBEAT_ATTEMPT_AT_KEY);
  if (!stored) return null;

  const parsed = Number(stored);
  return Number.isFinite(parsed) ? parsed : null;
}

type ConnectionStatus = "connected" | "disconnected" | "sending";

export default function App() {
  const [tools, setTools] = useState<ToolId[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoStart, setAutoStart] = useState(false);
  const [autoStartPending, setAutoStartPending] = useState(false);
  const [autoStartError, setAutoStartError] = useState<string | null>(null);
  const anonId = useRef(getOrCreateAnonId());
  const detectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHeartbeatAttemptAtRef = useRef<number | null>(getStoredHeartbeatAttemptAt());
  const toolsRef = useRef<ToolId[]>([]);

  const detectTools = useCallback(async () => {
    try {
      const detected = await invoke<string[]>("detect_tools");
      const filtered = detected.filter((tool): tool is ToolId =>
        KNOWN_TOOLS.includes(tool as ToolId),
      );
      const sorted = sortDetectedTools(filtered);
      setTools((current) => (areToolsEqual(current, sorted) ? current : sorted));
    } catch {
      console.error("Failed to detect tools");
    }
  }, []);

  const sendHeartbeat = useCallback(async () => {
    if (toolsRef.current.length === 0) return;

    const now = Date.now();
    lastHeartbeatAttemptAtRef.current = now;
    localStorage.setItem(LAST_HEARTBEAT_ATTEMPT_AT_KEY, now.toString());

    setStatus("sending");
    try {
      const ok = await invoke<boolean>("send_heartbeat", {
        anonId: anonId.current,
        tools: toolsRef.current,
      });
      setStatus(ok ? "connected" : "disconnected");
      if (ok) {
        setLastHeartbeat(new Date(now));
      }
    } catch {
      setStatus("disconnected");
    }
  }, []);

  const clearHeartbeatTimeout = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  const scheduleHeartbeat = useCallback(() => {
    clearHeartbeatTimeout();

    if (toolsRef.current.length === 0) return;

    const lastAttemptAt = lastHeartbeatAttemptAtRef.current;
    const delay = lastAttemptAt === null
      ? 0
      : Math.max(HEARTBEAT_INTERVAL - (Date.now() - lastAttemptAt), 0);

    heartbeatTimeoutRef.current = setTimeout(() => {
      void sendHeartbeat().finally(() => {
        scheduleHeartbeat();
      });
    }, delay);
  }, [clearHeartbeatTimeout, sendHeartbeat]);

  useEffect(() => {
    toolsRef.current = tools;
  }, [tools]);

  useEffect(() => {
    detectTools();
    detectIntervalRef.current = setInterval(detectTools, DETECTION_INTERVAL);
    return () => {
      if (detectIntervalRef.current) clearInterval(detectIntervalRef.current);
    };
  }, [detectTools]);

  useEffect(() => {
    scheduleHeartbeat();
  }, [scheduleHeartbeat, tools]);

  useEffect(() => clearHeartbeatTimeout, [clearHeartbeatTimeout]);

  useEffect(() => {
    isEnabled()
      .then((enabled) => {
        setAutoStart(enabled);
        setAutoStartError(null);
      })
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : "Unable to check startup status.";
        setAutoStartError(message);
      });
  }, []);

  const handleAutoStartChange = async (enabled: boolean) => {
    setAutoStartPending(true);
    setAutoStartError(null);
    try {
      if (enabled) {
        await enable();
      } else {
        await disable();
      }
      const current = await isEnabled();
      setAutoStart(current);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to toggle startup mode.";
      setAutoStartError(message);
    } finally {
      setAutoStartPending(false);
    }
  };

  const statusColor: Record<ConnectionStatus, string> = {
    connected: "bg-emerald-400",
    disconnected: "bg-red-400",
    sending: "bg-amber-400 animate-pulse",
  };

  const statusLabel: Record<ConnectionStatus, string> = {
    connected: "Connected",
    disconnected: "Disconnected",
    sending: "Sending…",
  };

  const handleHeaderMouseDown = useCallback(async (event: MouseEvent<HTMLElement>) => {
    if (event.button !== 0) return;

    const target = event.target as HTMLElement | null;
    if (target?.closest(HEADER_INTERACTIVE_SELECTOR)) return;

    try {
      await getCurrentWindow().startDragging();
    } catch (error) {
      console.error("Failed to start window drag", error);
    }
  }, []);

  const visibleTools = KNOWN_TOOLS.map((tool) => ({
    id: tool,
    online: tools.includes(tool),
  }));

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-950 text-gray-100 select-none">
      {/* Header */}
      <header
        data-tauri-drag-region
        onMouseDownCapture={handleHeaderMouseDown}
        className={`flex items-center justify-between border-b border-gray-800 px-5 pb-4 ${
          IS_MAC ? "pt-14" : "pt-4"
        }`}
      >
        <div
          data-tauri-drag-region
          className="pointer-events-none flex items-center gap-3"
        >
          <img
            data-tauri-drag-region
            src="/logo.png"
            alt="Vibe Coders Map logo"
            className="h-16 w-16 shrink-0 object-contain"
          />
          <h1
            data-tauri-drag-region
            className="text-lg font-semibold tracking-tight"
          >
            Vibe Coders Map
          </h1>
        </div>
        <div
          data-tauri-drag-region
          className="pointer-events-none flex items-center gap-2"
        >
          <span
            data-tauri-drag-region
            className={`h-2.5 w-2.5 rounded-full ${statusColor[status]}`}
          />
          <span
            data-tauri-drag-region
            className="text-xs text-gray-400"
          >
            {statusLabel[status]}
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto px-5 py-4">
        {settingsOpen ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-200">Settings</h2>
              <button
                onClick={() => setSettingsOpen(false)}
                className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="space-y-3 rounded-xl border border-gray-800 bg-gray-900 p-4">
              <Toggle
                label="Launch on startup"
                checked={autoStart}
                disabled={autoStartPending}
                onChange={handleAutoStartChange}
              />
              {autoStartError && (
                <p className="text-[11px] leading-relaxed text-rose-300">
                  Startup setting failed: {autoStartError}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {tools.length === 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-gray-800 bg-gray-900/55 px-3 py-2 text-xs text-gray-500">
                <span className="h-2 w-2 rounded-full bg-gray-600" />
                Open a supported tool and it will switch to Online within a few seconds.
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {visibleTools.map((tool) => (
                <ToolCard key={tool.id} name={tool.id} online={tool.online} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-5 py-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            {lastHeartbeat && (
              <span className="text-[10px] text-gray-500">
                Last ping:{" "}
                {lastHeartbeat.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            <div className="ml-auto">
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className={`rounded-md p-1.5 transition-colors ${
                  settingsOpen
                    ? "bg-gray-800 text-gray-300"
                    : "text-gray-500 hover:bg-gray-800 hover:text-gray-300"
                }`}
                aria-label="Settings"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
