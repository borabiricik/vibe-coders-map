import {
  checkPermissions,
  getCurrentPosition,
  requestPermissions,
} from "@tauri-apps/plugin-geolocation";
import { logFrontendError, logFrontendInfo } from "./logging";

const LOCATION_CACHE_KEY = "vibe_location_cache_v1";
const LOCATION_FAILURE_AT_KEY = "vibe_location_failure_at";
const LOCATION_TTL_MS = 60 * 60 * 1000;
const LOCATION_RETRY_AFTER_FAILURE_MS = 15 * 60 * 1000;

export interface HeartbeatLocation {
  lat: number;
  lng: number;
  capturedAt: number;
}

type GeolocationPermissionState =
  | "granted"
  | "denied"
  | "prompt"
  | "prompt-with-rationale"
  | "prompt-with-rationale-required";

interface GeolocationPermissionsResponse {
  location: GeolocationPermissionState;
}

function roundCoordinate(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function getStoredLocation(): HeartbeatLocation | null {
  const raw = localStorage.getItem(LOCATION_CACHE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<HeartbeatLocation>;
    if (
      typeof parsed.lat === "number" &&
      Number.isFinite(parsed.lat) &&
      typeof parsed.lng === "number" &&
      Number.isFinite(parsed.lng) &&
      typeof parsed.capturedAt === "number" &&
      Number.isFinite(parsed.capturedAt)
    ) {
      return {
        lat: parsed.lat,
        lng: parsed.lng,
        capturedAt: parsed.capturedAt,
      };
    }
  } catch {
    localStorage.removeItem(LOCATION_CACHE_KEY);
  }

  return null;
}

function setStoredLocation(location: HeartbeatLocation) {
  localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(location));
}

function getLastLocationFailureAt(): number | null {
  const raw = localStorage.getItem(LOCATION_FAILURE_AT_KEY);
  if (!raw) return null;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function setLastLocationFailureAt(timestamp: number) {
  localStorage.setItem(LOCATION_FAILURE_AT_KEY, timestamp.toString());
}

function clearLastLocationFailureAt() {
  localStorage.removeItem(LOCATION_FAILURE_AT_KEY);
}

export async function getHeartbeatLocation(): Promise<HeartbeatLocation | null> {
  const cached = getStoredLocation();
  if (cached && Date.now() - cached.capturedAt < LOCATION_TTL_MS) {
    return cached;
  }

  const lastFailureAt = getLastLocationFailureAt();
  if (lastFailureAt && Date.now() - lastFailureAt < LOCATION_RETRY_AFTER_FAILURE_MS) {
    return cached;
  }

  try {
    let permissions = await checkPermissions() as GeolocationPermissionsResponse;

    if (
      permissions.location === "prompt" ||
      permissions.location === "prompt-with-rationale" ||
      permissions.location === "prompt-with-rationale-required"
    ) {
      permissions = await requestPermissions(["location"]) as GeolocationPermissionsResponse;
    }

    if (permissions.location !== "granted") {
      setLastLocationFailureAt(Date.now());
      await logFrontendInfo(`Location permission not granted: ${permissions.location}`);
      return cached;
    }

    const position = await getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: LOCATION_TTL_MS,
    });

    const resolved: HeartbeatLocation = {
      lat: roundCoordinate(position.coords.latitude),
      lng: roundCoordinate(position.coords.longitude),
      capturedAt: Date.now(),
    };

    setStoredLocation(resolved);
    clearLastLocationFailureAt();
    return resolved;
  } catch (error) {
    setLastLocationFailureAt(Date.now());
    await logFrontendError("resolve_location", error);
    return cached;
  }
}
