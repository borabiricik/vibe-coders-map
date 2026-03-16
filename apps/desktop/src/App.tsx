import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { ToolCard } from "./components/ToolCard";
import { Toggle } from "./components/Toggle";

const POLL_INTERVAL = 5 * 60 * 1000;
const ANON_ID_KEY = "vibe_anon_id";

function getOrCreateAnonId(): string {
  const existing = localStorage.getItem(ANON_ID_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(ANON_ID_KEY, id);
  return id;
}

type ConnectionStatus = "connected" | "disconnected" | "sending";

export default function App() {
  const [tools, setTools] = useState<string[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoStart, setAutoStart] = useState(false);
  const anonId = useRef(getOrCreateAnonId());
  const detectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const toolsRef = useRef<string[]>([]);

  const detectTools = useCallback(async () => {
    try {
      const detected = await invoke<string[]>("detect_tools");
      setTools(detected.sort());
    } catch {
      console.error("Failed to detect tools");
    }
  }, []);

  const sendHeartbeat = useCallback(async () => {
    if (toolsRef.current.length === 0) return;
    setStatus("sending");
    try {
      const ok = await invoke<boolean>("send_heartbeat", {
        anonId: anonId.current,
        tools: toolsRef.current,
      });
      setStatus(ok ? "connected" : "disconnected");
      if (ok) setLastHeartbeat(new Date());
    } catch {
      setStatus("disconnected");
    }
  }, []);

  useEffect(() => {
    toolsRef.current = tools;
  }, [tools]);

  useEffect(() => {
    detectTools();
    detectIntervalRef.current = setInterval(detectTools, POLL_INTERVAL);
    return () => {
      if (detectIntervalRef.current) clearInterval(detectIntervalRef.current);
    };
  }, [detectTools]);

  useEffect(() => {
    sendHeartbeat();
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, POLL_INTERVAL);
    return () => {
      if (heartbeatIntervalRef.current)
        clearInterval(heartbeatIntervalRef.current);
    };
  }, [sendHeartbeat]);

  useEffect(() => {
    sendHeartbeat();
  }, [tools, sendHeartbeat]);

  useEffect(() => {
    isEnabled()
      .then(setAutoStart)
      .catch(() => {});
  }, []);

  const handleAutoStartChange = async (enabled: boolean) => {
    try {
      if (enabled) {
        await enable();
      } else {
        await disable();
      }
      setAutoStart(enabled);
    } catch {
      console.error("Failed to toggle autostart");
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

  return (
    <div className="flex h-screen flex-col bg-gray-950 text-gray-100 select-none">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold">
            V
          </div>
          <h1 className="text-lg font-semibold tracking-tight">
            Vibe Coders Map
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${statusColor[status]}`}
          />
          <span className="text-xs text-gray-400">{statusLabel[status]}</span>
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
                onChange={handleAutoStartChange}
              />
            </div>
          </div>
        ) : tools.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-500">
            <svg
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <p className="text-sm font-medium">No tools detected</p>
            <p className="text-xs text-gray-600">
              Start an AI coding tool and it will appear here
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {tools.map((tool) => (
              <ToolCard key={tool} name={tool} active />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-5 py-3">
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
      </footer>
    </div>
  );
}
