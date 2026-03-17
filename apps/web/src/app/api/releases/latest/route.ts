import { NextResponse } from "next/server";

const GITHUB_OWNER = "borabiricik";
const GITHUB_REPO = "vibe-coders-map";
const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;
const GITHUB_LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const GITHUB_RELEASES_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases?per_page=10`;

type GithubReleaseAsset = {
  browser_download_url: string;
  name: string;
  size: number;
};

type GithubReleaseResponse = {
  assets: GithubReleaseAsset[];
  draft: boolean;
  html_url: string;
  name: string | null;
  prerelease: boolean;
  published_at: string;
  tag_name: string;
};

type ReleaseDownload = {
  arch: "apple-silicon" | "intel" | "universal";
  label: string;
  name: string;
  size: number;
  url: string;
};

function isMacOsAsset(asset: GithubReleaseAsset) {
  const name = asset.name.toLowerCase();

  return (
    name.endsWith(".dmg") ||
    name.endsWith(".pkg") ||
    name.endsWith(".app.tar.gz") ||
    name.includes("darwin")
  );
}

function getAssetPriority(asset: GithubReleaseAsset) {
  const name = asset.name.toLowerCase();

  if (name.endsWith(".dmg")) {
    return 0;
  }

  if (name.endsWith(".pkg")) {
    return 1;
  }

  if (name.endsWith(".app.tar.gz")) {
    return 2;
  }

  return 3;
}

function isAppleSiliconAsset(asset: GithubReleaseAsset) {
  const name = asset.name.toLowerCase();
  return name.includes("aarch64") || name.includes("arm64");
}

function isIntelAsset(asset: GithubReleaseAsset) {
  const name = asset.name.toLowerCase();
  return (
    name.includes("x86_64") || name.includes("x64") || name.includes("amd64")
  );
}

function isUniversalAsset(asset: GithubReleaseAsset) {
  const name = asset.name.toLowerCase();
  return name.includes("universal");
}

function getBestAsset(
  assets: GithubReleaseAsset[],
): GithubReleaseAsset | undefined {
  return [...assets].sort((left, right) => {
    return getAssetPriority(left) - getAssetPriority(right);
  })[0];
}

function toDownload(
  asset: GithubReleaseAsset | undefined,
  arch: ReleaseDownload["arch"],
  label: string,
): ReleaseDownload | null {
  if (!asset) {
    return null;
  }

  return {
    arch,
    label,
    name: asset.name,
    size: asset.size,
    url: asset.browser_download_url,
  };
}

async function fetchGithubRelease(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": `${GITHUB_REPO}-web`,
    },
    next: { revalidate: 3600 },
  });

  return response;
}

async function getLatestRelease() {
  const latestResponse = await fetchGithubRelease(GITHUB_LATEST_RELEASE_API);

  if (latestResponse.ok) {
    return (await latestResponse.json()) as GithubReleaseResponse;
  }

  const releasesResponse = await fetchGithubRelease(GITHUB_RELEASES_API);

  if (!releasesResponse.ok) {
    throw new Error(`GitHub release request failed: ${releasesResponse.status}`);
  }

  const releases = (await releasesResponse.json()) as GithubReleaseResponse[];

  return (
    releases.find((release) => !release.draft && !release.prerelease) ?? null
  );
}

export async function GET() {
  try {
    const release = await getLatestRelease();

    if (!release) {
      return NextResponse.json(
        {
          publishedAt: null,
          releaseName: "No public release yet",
          releaseUrl: GITHUB_RELEASES_URL,
          tagName: "Unavailable",
          downloads: [],
          unavailableReason:
            "A public GitHub release is not available yet. You can still check the releases page manually.",
        },
        {
          headers: {
            "Cache-Control":
              "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        },
      );
    }

    const macAssets = release.assets.filter(isMacOsAsset);

    const universalAsset = getBestAsset(macAssets.filter(isUniversalAsset));
    const appleSiliconAsset =
      universalAsset ??
      getBestAsset(macAssets.filter((asset) => isAppleSiliconAsset(asset)));
    const intelAsset =
      universalAsset ??
      getBestAsset(macAssets.filter((asset) => isIntelAsset(asset)));

    const downloads = [
      toDownload(universalAsset, "universal", "macOS Universal"),
      universalAsset
        ? null
        : toDownload(
            appleSiliconAsset,
            "apple-silicon",
            "macOS Apple Silicon",
          ),
      universalAsset ? null : toDownload(intelAsset, "intel", "macOS Intel"),
    ].filter((download): download is ReleaseDownload => download !== null);

    return NextResponse.json(
      {
        publishedAt: release.published_at,
        releaseName: release.name ?? release.tag_name,
        releaseUrl: release.html_url || GITHUB_RELEASES_URL,
        tagName: release.tag_name,
        downloads,
        unavailableReason:
          downloads.length === 0
            ? "The latest public release exists, but no macOS build asset was found in it."
            : undefined,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to load the latest release." },
      { status: 502 },
    );
  }
}
