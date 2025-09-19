import fs from 'node:fs';
import path from 'node:path';

export function getDevEcoSdkPath() {
  const sdkRoot = process.env['DEVECO_SDK_HOME'];
  if (!sdkRoot) {
    throw new Error(
      'DEVECO_SDK_HOME environment variable is not set. Please set it and run again',
    );
  }
  return sdkRoot;
}

export function getDevEcoBuildToolsPath() {
  return path.join(getDevEcoSdkPath(), '..', 'tools');
}

/**
 * Build tools are located in the <sdk-root>/build-tools/<version>/ directory.
 */
export function findAndroidBuildTool(toolName: string) {
  const buildToolsPath = path.join(getDevEcoBuildToolsPath());
  const versions = fs
    .readdirSync(buildToolsPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(versionCompare)
    .reverse();

  for (const version of versions) {
    const toolPath = path.join(buildToolsPath, version, toolName);
    if (fs.existsSync(toolPath)) {
      return toolPath;
    }
  }

  return null;
}

export function versionCompare(first: string, second: string) {
  const firstVersion = parseVersionString(first);
  const secondVersion = parseVersionString(second);

  if (!firstVersion || !secondVersion) {
    return first.localeCompare(second);
  }

  if (firstVersion.major !== secondVersion.major) {
    return firstVersion.major - secondVersion.major;
  }
  if (firstVersion.minor !== secondVersion.minor) {
    return firstVersion.minor - secondVersion.minor;
  }

  return firstVersion.patch - secondVersion.patch;
}

function parseVersionString(version: string) {
  if (!isVersionString(version)) {
    return null;
  }

  const [major, minor, patch] = version.split('.').map(Number);
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
  };
}

function isVersionString(version: string) {
  return /^[0-9]+\.[0-9]+\.[0-9]+$/.test(version);
}
