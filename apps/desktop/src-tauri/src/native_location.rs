use serde::Serialize;
use std::fmt;

const LOCATION_TIMEOUT_MS: u32 = 15_000;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NativeLocation {
    pub lat: f64,
    pub lng: f64,
    pub accuracy: f64,
    pub captured_at: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NativeLocationError {
    ServicesDisabled,
    PermissionDenied,
    PermissionRestricted,
    TimedOut,
    Unavailable,
    Error,
}

impl fmt::Display for NativeLocationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let message = match self {
            Self::ServicesDisabled => "Location services are disabled on this Mac.",
            Self::PermissionDenied => "Location permission was denied for Vibe Coders Map.",
            Self::PermissionRestricted => "Location permission is restricted on this Mac.",
            Self::TimedOut => "Timed out while waiting for a location fix.",
            Self::Unavailable => "A device location was not available.",
            Self::Error => "The native macOS location request failed.",
        };
        f.write_str(message)
    }
}

#[cfg(target_os = "macos")]
#[link(name = "vibe_location_bridge", kind = "static")]
unsafe extern "C" {
    fn vibe_request_current_location(
        latitude: *mut f64,
        longitude: *mut f64,
        accuracy: *mut f64,
        captured_at_ms: *mut u64,
        timeout_ms: u32,
    ) -> i32;
}

#[cfg(target_os = "macos")]
pub fn resolve_current_location() -> Result<NativeLocation, NativeLocationError> {
    let mut lat = 0.0_f64;
    let mut lng = 0.0_f64;
    let mut accuracy = 0.0_f64;
    let mut captured_at = 0_u64;

    let result = unsafe {
        vibe_request_current_location(
            &mut lat,
            &mut lng,
            &mut accuracy,
            &mut captured_at,
            LOCATION_TIMEOUT_MS,
        )
    };

    match result {
        0 => Ok(NativeLocation {
            lat,
            lng,
            accuracy,
            captured_at,
        }),
        1 => Err(NativeLocationError::ServicesDisabled),
        2 => Err(NativeLocationError::PermissionDenied),
        3 => Err(NativeLocationError::PermissionRestricted),
        4 => Err(NativeLocationError::TimedOut),
        5 => Err(NativeLocationError::Unavailable),
        _ => Err(NativeLocationError::Error),
    }
}

#[cfg(not(target_os = "macos"))]
pub fn resolve_current_location() -> Result<NativeLocation, NativeLocationError> {
    Err(NativeLocationError::Unavailable)
}
