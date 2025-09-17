import fs from 'node:fs';
import path from 'node:path';

export function getAndroidSdkPath() {
  const sdkRoot =
    process.env['ANDROID_HOME'] || process.env['ANDROID_SDK_ROOT'];
  if (!sdkRoot) {
    throw new Error(
      'ANDROID_HOME or ANDROID_SDK_ROOT environment variable is not set. Please follow instructions at: https://reactnative.dev/docs/set-up-your-environment?platform=android',
    );
  }
  return sdkRoot;
}

export function getAndroidBuildToolsPath() {
  return path.join(getAndroidSdkPath(), 'build-tools');
}

/**
 * Build tools are located in the <sdk-root>/build-tools/<version>/ directory.
 */
export function findAndroidBuildTool(toolName: string) {
  const buildToolsPath = path.join(getAndroidBuildToolsPath());
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
