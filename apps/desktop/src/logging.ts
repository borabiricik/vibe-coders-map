import { error as writeErrorLog, info as writeInfoLog, warn as writeWarnLog } from "@tauri-apps/plugin-log";

type ConsoleMethod = "warn" | "error";

const nativeConsole = {
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

let loggingInitialized = false;

function safeJsonStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function serializeUnknown(value: unknown): string {
  if (value instanceof Error) {
    const stack = value.stack ? `\n${value.stack}` : "";
    return `${value.name}: ${value.message}${stack}`;
  }

  if (typeof value === "string") {
    return value;
  }

  const json = safeJsonStringify(value);
  if (json !== null) {
    return json;
  }

  return String(value);
}

function formatConsoleArgs(args: unknown[]): string {
  return args.map((value) => serializeUnknown(value)).join(" ");
}

async function writeLog(level: "info" | "warn" | "error", message: string) {
  try {
    if (level === "info") {
      await writeInfoLog(message);
      return;
    }

    if (level === "warn") {
      await writeWarnLog(message);
      return;
    }

    await writeErrorLog(message);
  } catch (loggingError) {
    nativeConsole.error("[desktop-logging] Failed to write log entry", loggingError);
  }
}

function patchConsoleMethod(method: ConsoleMethod, level: "warn" | "error") {
  const original = nativeConsole[method];

  console[method] = (...args: unknown[]) => {
    original(...args);
    void writeLog(level, `[console.${method}] ${formatConsoleArgs(args)}`);
  };
}

export async function logFrontendInfo(message: string) {
  await writeLog("info", message);
}

export async function logFrontendError(
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>,
) {
  const metadataSuffix = metadata ? ` | metadata=${serializeUnknown(metadata)}` : "";
  await writeLog("error", `[${context}] ${serializeUnknown(error)}${metadataSuffix}`);
}

export function setupErrorLogging() {
  if (loggingInitialized) return;
  loggingInitialized = true;

  patchConsoleMethod("warn", "warn");
  patchConsoleMethod("error", "error");

  window.addEventListener("error", (event) => {
    const location = event.filename
      ? `${event.filename}:${event.lineno}:${event.colno}`
      : "unknown";
    const errorValue = event.error ?? event.message;

    void logFrontendError("window.error", errorValue, {
      location,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    void logFrontendError("window.unhandledrejection", event.reason);
  });

  void logFrontendInfo("Frontend file logging initialized");
}
