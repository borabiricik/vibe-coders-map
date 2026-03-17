use std::{
    env, fs,
    path::{Path, PathBuf},
};

const API_URL_KEY: &str = "VIBE_API_URL";

fn main() {
    let app_dir =
        PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("missing CARGO_MANIFEST_DIR"))
            .parent()
            .expect("src-tauri should live under the desktop app directory")
            .to_path_buf();

    let profile = env::var("PROFILE").unwrap_or_else(|_| "debug".to_string());
    let env_files = env_file_chain(&profile);

    for file in &env_files {
        println!("cargo:rerun-if-changed={}", app_dir.join(file).display());
    }
    println!("cargo:rerun-if-env-changed={API_URL_KEY}");

    let api_url = env::var(API_URL_KEY)
        .ok()
        .filter(|value| !value.trim().is_empty())
        .or_else(|| resolve_from_env_files(&app_dir, &env_files, API_URL_KEY))
        .unwrap_or_else(|| {
            panic!("{API_URL_KEY} must be set via the environment or one of the desktop .env files")
        });

    println!("cargo:rustc-env={API_URL_KEY}={api_url}");

    tauri_build::build()
}

fn env_file_chain(profile: &str) -> Vec<&'static str> {
    let mut files = vec![".env"];

    if profile == "release" {
        files.push(".env.production");
        files.push(".env.production.local");
    } else {
        files.push(".env.development");
        files.push(".env.development.local");
    }

    files.push(".env.local");
    files
}

fn resolve_from_env_files(app_dir: &Path, env_files: &[&str], key: &str) -> Option<String> {
    let mut resolved = None;

    for file in env_files {
        let path = app_dir.join(file);
        if !path.exists() {
            continue;
        }

        if let Some(value) = parse_env_file(&path, key) {
            resolved = Some(value);
        }
    }

    resolved
}

fn parse_env_file(path: &Path, key: &str) -> Option<String> {
    let contents = fs::read_to_string(path)
        .unwrap_or_else(|error| panic!("failed to read {}: {error}", path.display()));

    for line in contents.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        let Some((candidate_key, raw_value)) = trimmed.split_once('=') else {
            continue;
        };

        if candidate_key.trim() != key {
            continue;
        }

        return Some(strip_quotes(raw_value.trim()).to_string());
    }

    None
}

fn strip_quotes(value: &str) -> &str {
    if value.len() >= 2 {
        let bytes = value.as_bytes();
        let starts_with_quote = bytes[0] == b'"' || bytes[0] == b'\'';
        let ends_with_quote = bytes[value.len() - 1] == b'"' || bytes[value.len() - 1] == b'\'';

        if starts_with_quote && ends_with_quote {
            return &value[1..value.len() - 1];
        }
    }

    value
}
