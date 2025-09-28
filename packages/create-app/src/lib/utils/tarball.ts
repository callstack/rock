import fs from 'node:fs';
import path from 'node:path';
import { getNameWithoutExtension, RockError } from '@rock-js/tools';
import * as tar from 'tar';

export async function downloadTarballFromNpm(
  packageName: string,
  version = 'latest',
  targetDir: string,
) {
  try {
    const versionData = await getPackageVersionData(packageName, version);

    const tarballUrl = versionData.dist?.tarball;
    if (!tarballUrl) {
      throw new RockError('Tarball URL not found.');
    }

    const tarballResponse = await fetch(tarballUrl);
    if (!tarballResponse.ok) {
      throw new RockError(
        `Failed to fetch package ${packageName}: ${tarballResponse.statusText}`,
      );
    }

    const tarballPath = path.join(
      targetDir,
      `${packageName.replace('/', '-')}.tgz`,
    );
    // Write the tarball to disk
    const arrayBuffer = await tarballResponse.arrayBuffer();
    fs.writeFileSync(tarballPath, new Uint8Array(arrayBuffer));

    return tarballPath;
  } catch (error) {
    throw new RockError(`Error downloading package ${packageName}`, {
      cause: error,
    });
  }
}

async function getPackageVersionData(packageName: string, version: string) {
  // Fetch package metadata from npm registry
  const registryUrl = `${process.env['NPM_CONFIG_REGISTRY'] || 'https://registry.npmjs.org'}/${packageName}`;
  const response = await fetch(registryUrl);

  if (!response.ok) {
    throw new RockError(
      `Failed to fetch package metadata for ${packageName}: ${response.statusText}`,
    );
  }

  const metadata = await response.json();
  const versionTag = metadata['dist-tags']?.[version];
  const versionData = versionTag
    ? metadata.versions?.[versionTag]
    : metadata.versions?.[version];
  if (!versionData) {
    throw new RockError(
      `Version ${version} not found for package ${packageName}`,
    );
  }
  return versionData;
}

/**
 * Extracts a tarball to a temporary directory and returns the path to the extracted directory
 * @param tarballPath - Path to the tarball to extract
 * @param targetDir - Parent directory where temp directory will be created in
 * @returns Path to the extracted directory
 */
// This automatically handles both .tgz and .tar files
export async function extractTarballToTempDirectory(
  targetDir: string,
  tarballPath: string,
): Promise<string> {
  const tempFolder = path.join(
    targetDir,
    `.temp-${getNameWithoutExtension(tarballPath)}-${Date.now()}`,
  );
  fs.mkdirSync(tempFolder, { recursive: true });

  await tar.extract({
    file: tarballPath,
    cwd: tempFolder,
    strip: 1, // Remove top-level directory
  });

  return tempFolder;
}
